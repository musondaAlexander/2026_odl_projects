package zm.zut.exam.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import zm.zut.exam.domain.AnswerSubmission;

public interface AnswerSubmissionRepository extends JpaRepository<AnswerSubmission, Long> {
}
