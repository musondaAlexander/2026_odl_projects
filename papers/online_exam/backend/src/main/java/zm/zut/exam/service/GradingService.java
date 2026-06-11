package zm.zut.exam.service;

import org.springframework.stereotype.Service;
import zm.zut.exam.domain.Question;
import zm.zut.exam.domain.QuestionType;

/**
 * Auto-grading of objective question types (objective 1). MCQ, TRUE_FALSE and
 * SHORT_ANSWER are graded by normalised string comparison against the stored
 * correct answer. WRITTEN answers are not auto-scored (they are plagiarism-
 * screened instead), so {@link #grade} returns null for them.
 */
@Service
public class GradingService {

    /** A null result means the question is not objectively auto-gradable. */
    public record GradeResult(boolean correct, double awarded) {}

    public boolean isObjective(QuestionType type) {
        return type != QuestionType.WRITTEN;
    }

    public GradeResult grade(Question question, String response) {
        if (!isObjective(question.getType())) {
            return null;
        }
        boolean correct = normalize(response).equals(normalize(question.getCorrectAnswer()))
                && !normalize(response).isEmpty();
        return new GradeResult(correct, correct ? question.getMarks() : 0.0);
    }

    /** Lowercase, trim and collapse internal whitespace for tolerant matching. */
    static String normalize(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
