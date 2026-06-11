package zm.zut.exam.dto;

public final class AnalyticsDtos {
    private AnalyticsDtos() {}

    public record ExamAnalytics(
            Long examId, String title, long participants, double averageScore,
            double plagiarismFlagRate, long writtenAnswers, long flaggedAnswers) {}

    public record Dashboard(
            long users, long students, long lecturers, long questions,
            long exams, long attempts, double avgScore, double flagRate) {}

    public record PlagiarismRow(
            Long attemptId, String studentName, String examTitle, Long questionId,
            double similarity, boolean flagged, String matchedId, String evidence) {}
}
