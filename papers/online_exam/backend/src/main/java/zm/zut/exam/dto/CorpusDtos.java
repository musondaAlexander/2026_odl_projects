package zm.zut.exam.dto;

import jakarta.validation.constraints.NotBlank;

public final class CorpusDtos {
    private CorpusDtos() {}

    public record CorpusRequest(@NotBlank String title, @NotBlank String content) {}

    public record CorpusView(Long id, String title, int length) {}
}
