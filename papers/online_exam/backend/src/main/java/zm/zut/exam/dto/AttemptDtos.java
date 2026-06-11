package zm.zut.exam.dto;

import java.time.Instant;
import java.util.List;

public final class AttemptDtos {
    private AttemptDtos() {}

    /** A question as delivered to a student — never carries the correct answer. */
    public record DeliveredQuestion(
            Long questionId, String type, String text, List<String> options,
            int marks, String savedResponse) {}

    public record AttemptView(
            Long attemptId, Long examId, String examTitle, String status,
            Instant startedAt, Instant deadlineAt, long secondsRemaining,
            List<DeliveredQuestion> questions) {}

    public record SaveAnswerRequest(Long questionId, String response) {}

    public record AttemptSummary(
            Long attemptId, Long examId, String examTitle, String status,
            double scorePercent, Instant startedAt, Instant submittedAt) {}

    public record PlagiarismView(
            double similarity, boolean flagged, double threshold,
            String matchedId, String evidence, boolean analyzed) {}

    public record AnswerResult(
            Long questionId, String type, String questionText, String response,
            String correctAnswer, double awarded, int marks, Boolean correct,
            PlagiarismView plagiarism) {}

    public record ResultView(
            Long attemptId, String examTitle, String studentName, String status,
            double awardedMarks, double totalMarks, double scorePercent,
            Instant submittedAt, List<AnswerResult> answers) {}
}
