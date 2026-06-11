package zm.zut.exam.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import zm.zut.exam.domain.Question;

public interface QuestionRepository extends JpaRepository<Question, Long> {
}
