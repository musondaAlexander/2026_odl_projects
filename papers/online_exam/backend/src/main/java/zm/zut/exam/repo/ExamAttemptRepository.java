package zm.zut.exam.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import zm.zut.exam.domain.AttemptStatus;
import zm.zut.exam.domain.Exam;
import zm.zut.exam.domain.ExamAttempt;
import zm.zut.exam.domain.User;

import java.time.Instant;
import java.util.List;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    List<ExamAttempt> findByStudentOrderByStartedAtDesc(User student);
    List<ExamAttempt> findByExam(Exam exam);
    List<ExamAttempt> findByExamAndStudent(Exam exam, User student);
    List<ExamAttempt> findByStatusAndDeadlineAtBefore(AttemptStatus status, Instant cutoff);
    long countByExam(Exam exam);
}
