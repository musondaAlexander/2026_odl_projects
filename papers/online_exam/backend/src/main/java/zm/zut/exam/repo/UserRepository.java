package zm.zut.exam.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import zm.zut.exam.domain.Role;
import zm.zut.exam.domain.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    long countByRole(Role role);
}
