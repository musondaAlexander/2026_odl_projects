package zm.zut.exam.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import zm.zut.exam.domain.Exam;

import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByPublishedTrue();
}
