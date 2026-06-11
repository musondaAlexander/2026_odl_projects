package zm.zut.exam;

import org.junit.jupiter.api.Test;
import zm.zut.exam.domain.Question;
import zm.zut.exam.domain.QuestionType;
import zm.zut.exam.service.GradingService;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Auto-grading logic for objective question types (objective 1). */
class GradingServiceTest {

    private final GradingService grading = new GradingService();

    private Question q(QuestionType type, String answer, int marks) {
        Question q = new Question();
        q.setType(type);
        q.setCorrectAnswer(answer);
        q.setMarks(marks);
        return q;
    }

    @Test
    void mcqAwardsFullMarksWhenCorrect() {
        Question q = q(QuestionType.MCQ, "Queue", 2);
        q.setOptions(List.of("Stack", "Queue"));
        GradingService.GradeResult r = grading.grade(q, "Queue");
        assertTrue(r.correct());
        assertEquals(2.0, r.awarded());
    }

    @Test
    void gradingIsCaseAndWhitespaceInsensitive() {
        Question q = q(QuestionType.SHORT_ANSWER, "O(log n)", 2);
        assertTrue(grading.grade(q, "  o(log   n) ").correct());
    }

    @Test
    void wrongAnswerScoresZero() {
        Question q = q(QuestionType.MCQ, "Queue", 2);
        GradingService.GradeResult r = grading.grade(q, "Stack");
        assertFalse(r.correct());
        assertEquals(0.0, r.awarded());
    }

    @Test
    void blankAnswerIsNotCorrect() {
        Question q = q(QuestionType.TRUE_FALSE, "true", 1);
        assertFalse(grading.grade(q, "").correct());
    }

    @Test
    void writtenQuestionsAreNotAutoGraded() {
        Question q = q(QuestionType.WRITTEN, null, 5);
        assertFalse(grading.isObjective(QuestionType.WRITTEN));
        assertNull(grading.grade(q, "a long written response"));
    }
}
