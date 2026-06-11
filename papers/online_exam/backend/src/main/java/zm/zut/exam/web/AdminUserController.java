package zm.zut.exam.web;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import zm.zut.exam.domain.Role;
import zm.zut.exam.domain.User;
import zm.zut.exam.dto.AuthDtos.*;
import zm.zut.exam.repo.UserRepository;
import zm.zut.exam.service.AuthService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository users;
    private final AuthService auth;

    public AdminUserController(UserRepository users, AuthService auth) {
        this.users = users;
        this.auth = auth;
    }

    @GetMapping
    public List<UserView> list() {
        return users.findAll().stream().map(auth::view).toList();
    }

    @PostMapping
    public UserView create(@Valid @RequestBody CreateUserRequest req) {
        User u = auth.createUser(req.email(), req.password(), req.fullName(), parseRole(req.role()));
        return auth.view(u);
    }

    @PutMapping("/{id}/role")
    public UserView setRole(@PathVariable Long id, @Valid @RequestBody RoleUpdateRequest req) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        u.setRole(parseRole(req.role()));
        return auth.view(users.save(u));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!users.existsById(id)) throw ApiException.notFound("User");
        users.deleteById(id);
    }

    private Role parseRole(String raw) {
        try {
            return Role.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw ApiException.badRequest("Unknown role: " + raw);
        }
    }
}
