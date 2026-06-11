package zm.zut.exam.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class ExamDtos {
    private ExamDtos() {}

    public record ExamRequest(
            @NotBlank String title,
            String description,
            Integer durationMinutes,
            Integer questionCount,
            Double plagiarismThreshold) {}

    public record PoolRequest(List<Long> questionIds) {}

    public record ExamView(
            Long id, String title, String description, int durationMinutes,
            int questionCount, double plagiarismThreshold, boolean published,
            int poolSize, long attempts) {}
}
