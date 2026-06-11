package zm.zut.exam.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.Role;
import zm.zut.exam.domain.User;
import zm.zut.exam.dto.AuthDtos.*;
import zm.zut.exam.repo.UserRepository;
import zm.zut.exam.security.JwtService;
import zm.zut.exam.web.ApiException;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthenticationManager authManager;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                       AuthenticationManager authManager) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.authManager = authManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }
        User u = new User();
        u.setEmail(req.email().toLowerCase().trim());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setFullName(req.fullName().trim());
        u.setRole(Role.STUDENT); // self-registration is always a student
        users.save(u);
        return new AuthResponse(jwt.generate(u), view(u));
    }

    public AuthResponse login(LoginRequest req) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().toLowerCase().trim(), req.password()));
        User u = users.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> ApiException.notFound("User"));
        return new AuthResponse(jwt.generate(u), view(u));
    }

    /** Admin-only creation of privileged accounts. */
    @Transactional
    public User createUser(String email, String password, String fullName, Role role) {
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }
        User u = new User();
        u.setEmail(email.toLowerCase().trim());
        u.setPasswordHash(encoder.encode(password));
        u.setFullName(fullName.trim());
        u.setRole(role);
        return users.save(u);
    }

    public UserView view(User u) {
        return new UserView(u.getId(), u.getEmail(), u.getFullName(), u.getRole().name());
    }
}
