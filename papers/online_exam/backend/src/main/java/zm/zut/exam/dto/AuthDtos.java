package zm.zut.exam.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Authentication request/response payloads. */
public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 6, max = 100) String password,
            @NotBlank String fullName) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password) {}

    public record UserView(Long id, String email, String fullName, String role) {}

    /** Admin-only creation of lecturer/admin accounts. */
    public record CreateUserRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 6, max = 100) String password,
            @NotBlank String fullName,
            @NotBlank String role) {}

    public record RoleUpdateRequest(@NotBlank String role) {}

    public record AuthResponse(String token, UserView user) {}
}
