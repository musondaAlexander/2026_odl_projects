package zm.zut.exam.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class QuestionDtos {
    private QuestionDtos() {}

    public record QuestionRequest(
            @NotBlank String type,
            @NotBlank String text,
            List<String> options,
            String correctAnswer,
            Integer marks,
            String topic) {}

    /** Lecturer/admin view — includes the correct answer. */
    public record QuestionView(
            Long id, String type, String text, List<String> options,
            String correctAnswer, int marks, String topic) {}
}
