package zm.zut.exam;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.zut.exam.domain.*;
import zm.zut.exam.repo.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end exam flow over HTTP (MockMvc + H2): login → randomised delivery →
 * answer → submit → auto-grading, RBAC enforcement, and plagiarism graceful
 * degradation when the NLP service is offline.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExamFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository users;
    @Autowired QuestionRepository questions;
    @Autowired ExamRepository exams;
    @Autowired ExamAttemptRepository attempts;
    @Autowired PasswordEncoder encoder;

    private Long examId;

    @BeforeEach
    void setup() {
        // Clean in dependency order: attempts (cascade answers+flags) → exams
        // (clears the pool join table) → questions → users.
        attempts.deleteAll();
        exams.deleteAll();
        questions.deleteAll();
        users.deleteAll();

        user("lecturer@test.zm", "Lecturer", Role.LECTURER);
        user("student@test.zm", "Student", Role.STUDENT);

        Question mcq = new Question();
        mcq.setType(QuestionType.MCQ);
        mcq.setText("FIFO structure?");
        mcq.setOptions(List.of("Stack", "Queue"));
        mcq.setCorrectAnswer("Queue");
        mcq.setMarks(2);
        Question tf = new Question();
        tf.setType(QuestionType.TRUE_FALSE);
        tf.setText("HTTP is stateless.");
        tf.setOptions(List.of("true", "false"));
        tf.setCorrectAnswer("true");
        tf.setMarks(1);
        Question written = new Question();
        written.setType(QuestionType.WRITTEN);
        written.setText("Explain photosynthesis.");
        written.setMarks(5);
        questions.saveAll(List.of(mcq, tf, written));

        Exam exam = new Exam();
        exam.setTitle("Test Exam");
        exam.setDurationMinutes(30);
        exam.setQuestionCount(3);
        exam.setPlagiarismThreshold(0.6);
        exam.setPublished(true);
        Set<Question> pool = new HashSet<>(List.of(mcq, tf, written));
        exam.setPool(pool);
        examId = exams.save(exam).getId();
    }

    private void user(String email, String name, Role role) {
        User u = new User();
        u.setEmail(email);
        u.setFullName(name);
        u.setRole(role);
        u.setPasswordHash(encoder.encode("password123"));
        users.save(u);
    }

    private String token(String email) throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(java.util.Map.of("email", email, "password", "password123"))))
                .andExpect(status().isOk())
                .andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void studentTakesExamAndIsAutoGraded() throws Exception {
        String student = token("student@test.zm");

        // Start → randomised delivery (whole pool of 3 here), countdown set.
        MvcResult startRes = mvc.perform(post("/api/exams/" + examId + "/start")
                        .header("Authorization", "Bearer " + student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.secondsRemaining").value(org.hamcrest.Matchers.greaterThan(0)))
                .andReturn();
        JsonNode attempt = om.readTree(startRes.getResponse().getContentAsString());
        long attemptId = attempt.get("attemptId").asLong();
        JsonNode delivered = attempt.get("questions");
        assertEquals(3, delivered.size());

        // Answer every delivered question correctly (by type).
        for (JsonNode q : delivered) {
            String type = q.get("type").asText();
            String response = switch (type) {
                case "MCQ" -> "Queue";
                case "TRUE_FALSE" -> "true";
                default -> "Photosynthesis converts sunlight into chemical energy in plant cells.";
            };
            mvc.perform(post("/api/attempts/" + attemptId + "/answer")
                            .header("Authorization", "Bearer " + student)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(java.util.Map.of(
                                    "questionId", q.get("questionId").asLong(), "response", response))))
                    .andExpect(status().isOk());
        }

        // Submit → objective auto-grade = 100% (MCQ 2 + TF 1; written excluded from total).
        MvcResult submitRes = mvc.perform(post("/api/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scorePercent").value(100.0))
                .andExpect(jsonPath("$.totalMarks").value(3.0))
                .andReturn();

        // The written answer carries a plagiarism record marked not-analyzed (service offline in tests).
        JsonNode result = om.readTree(submitRes.getResponse().getContentAsString());
        boolean writtenHasOfflinePlagiarism = false;
        for (JsonNode a : result.get("answers")) {
            if (a.get("type").asText().equals("WRITTEN")) {
                JsonNode p = a.get("plagiarism");
                assertNotNull(p, "written answer should have a plagiarism record");
                assertFalse(p.get("analyzed").asBoolean());
                writtenHasOfflinePlagiarism = true;
            }
        }
        assertTrue(writtenHasOfflinePlagiarism);
    }

    @Test
    void studentCannotAccessLecturerQuestionBank() throws Exception {
        String student = token("student@test.zm");
        mvc.perform(get("/api/questions").header("Authorization", "Bearer " + student))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mvc.perform(get("/api/exams")).andExpect(status().is4xxClientError());
    }

    @Test
    void readEndpointsSerializeLazyCollections() throws Exception {
        // Guards against LazyInitializationException on read paths (open-in-view=false).
        String student = token("student@test.zm");
        mvc.perform(get("/api/exams/available").header("Authorization", "Bearer " + student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].poolSize").value(3));

        MvcResult startRes = mvc.perform(post("/api/exams/" + examId + "/start")
                        .header("Authorization", "Bearer " + student))
                .andExpect(status().isOk()).andReturn();
        long attemptId = om.readTree(startRes.getResponse().getContentAsString()).get("attemptId").asLong();
        mvc.perform(post("/api/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + student))
                .andExpect(status().isOk());

        mvc.perform(get("/api/attempts/" + attemptId + "/result").header("Authorization", "Bearer " + student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers.length()").value(3));
        mvc.perform(get("/api/me/attempts").header("Authorization", "Bearer " + student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].examTitle").value("Test Exam"));

        String lecturer = token("lecturer@test.zm");
        mvc.perform(get("/api/exams").header("Authorization", "Bearer " + lecturer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].poolSize").value(3));
    }

    @Test
    void lecturerCanListQuestionBank() throws Exception {
        String lecturer = token("lecturer@test.zm");
        mvc.perform(get("/api/questions").header("Authorization", "Bearer " + lecturer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }
}
