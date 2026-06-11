package zm.zut.exam.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import zm.zut.exam.domain.*;
import zm.zut.exam.repo.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds demo users, a mixed question bank, a reference corpus and a published
 * sample exam on first run (when {@code app.seed.enabled=true} and the DB is empty).
 * Demo password for every account: {@code password123}.
 */
@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    CommandLineRunner seed(UserRepository users, QuestionRepository questions,
                           CorpusDocumentRepository corpus, ExamRepository exams,
                           PasswordEncoder encoder,
                           @org.springframework.beans.factory.annotation.Value("${app.seed.enabled:true}") boolean enabled) {
        return args -> {
            if (!enabled || users.count() > 0) {
                return;
            }
            log.info("Seeding demo data (users, question bank, corpus, sample exam)...");

            User admin = newUser(users, encoder, "admin@exam.zm", "System Administrator", Role.ADMIN);
            User lecturer = newUser(users, encoder, "lecturer@exam.zm", "Dr. Tivwale Longwe", Role.LECTURER);
            newUser(users, encoder, "student1@exam.zm", "Elizabeth Luwita", Role.STUDENT);
            newUser(users, encoder, "student2@exam.zm", "Given Kabuka", Role.STUDENT);
            newUser(users, encoder, "student3@exam.zm", "Chanda Mwansa", Role.STUDENT);

            Question q1 = mcq(questions, lecturer, "Which data structure uses First-In-First-Out (FIFO) ordering?",
                    List.of("Stack", "Queue", "Binary Tree", "Hash Map"), "Queue", 2, "Data Structures");
            Question q2 = mcq(questions, lecturer, "Which SQL clause filters rows after aggregation/grouping?",
                    List.of("WHERE", "HAVING", "ORDER BY", "LIMIT"), "HAVING", 2, "Databases");
            Question q3 = trueFalse(questions, lecturer, "HTTP is a stateless protocol.", "true", "Networking");
            Question q4 = trueFalse(questions, lecturer, "TCP is a connectionless protocol.", "false", "Networking");
            Question q5 = shortAnswer(questions, lecturer, "Expand the abbreviation CPU.",
                    "central processing unit", 2, "Computer Architecture");
            Question q6 = shortAnswer(questions, lecturer, "State the time complexity of binary search in Big-O notation.",
                    "O(log n)", 2, "Algorithms");
            Question q7 = written(questions, lecturer, "Briefly explain the process of photosynthesis.", 5, "Biology");
            Question q8 = written(questions, lecturer, "Explain the purpose of normalization in relational databases.", 5, "Databases");

            corpusDoc(corpus, "Photosynthesis (textbook)",
                    "Photosynthesis converts sunlight into chemical energy in plant cells, producing glucose "
                            + "and oxygen from carbon dioxide and water using the green pigment chlorophyll.");
            corpusDoc(corpus, "Database Normalization (textbook)",
                    "Normalization in relational databases organizes data to reduce redundancy and improve data "
                            + "integrity by dividing large tables into smaller related tables and defining relationships.");

            Exam exam = new Exam();
            exam.setTitle("Introduction to Computing — Sample Exam");
            exam.setDescription("A mixed objective and written examination demonstrating randomised delivery, "
                    + "auto-grading and TF-IDF plagiarism screening.");
            exam.setDurationMinutes(30);
            exam.setQuestionCount(6);
            exam.setPlagiarismThreshold(0.6);
            exam.setPublished(true);
            exam.setCreatedBy(lecturer);
            Set<Question> pool = new HashSet<>(List.of(q1, q2, q3, q4, q5, q6, q7, q8));
            exam.setPool(pool);
            exams.save(exam);

            log.info("Seed complete: {} users, {} questions, sample exam '{}' published.",
                    users.count(), questions.count(), exam.getTitle());
        };
    }

    private User newUser(UserRepository users, PasswordEncoder encoder, String email, String name, Role role) {
        User u = new User();
        u.setEmail(email);
        u.setFullName(name);
        u.setRole(role);
        u.setPasswordHash(encoder.encode("password123"));
        return users.save(u);
    }

    private Question mcq(QuestionRepository repo, User by, String text, List<String> options, String answer, int marks, String topic) {
        Question q = base(by, QuestionType.MCQ, text, marks, topic);
        q.setOptions(new java.util.ArrayList<>(options));
        q.setCorrectAnswer(answer);
        return repo.save(q);
    }

    private Question trueFalse(QuestionRepository repo, User by, String text, String answer, String topic) {
        Question q = base(by, QuestionType.TRUE_FALSE, text, 1, topic);
        q.setOptions(new java.util.ArrayList<>(List.of("true", "false")));
        q.setCorrectAnswer(answer);
        return repo.save(q);
    }

    private Question shortAnswer(QuestionRepository repo, User by, String text, String answer, int marks, String topic) {
        Question q = base(by, QuestionType.SHORT_ANSWER, text, marks, topic);
        q.setCorrectAnswer(answer);
        return repo.save(q);
    }

    private Question written(QuestionRepository repo, User by, String text, int marks, String topic) {
        return repo.save(base(by, QuestionType.WRITTEN, text, marks, topic));
    }

    private Question base(User by, QuestionType type, String text, int marks, String topic) {
        Question q = new Question();
        q.setType(type);
        q.setText(text);
        q.setMarks(marks);
        q.setTopic(topic);
        q.setCreatedBy(by);
        return q;
    }

    private void corpusDoc(CorpusDocumentRepository repo, String title, String content) {
        CorpusDocument d = new CorpusDocument();
        d.setTitle(title);
        d.setContent(content);
        repo.save(d);
    }
}
