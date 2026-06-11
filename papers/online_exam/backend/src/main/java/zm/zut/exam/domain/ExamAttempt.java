package zm.zut.exam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A single student's sitting of an exam. The randomly-selected questions are
 * frozen into {@link #answers} at start so grading is deterministic, and
 * {@link #deadlineAt} (= startedAt + duration) drives the countdown timer and
 * automatic submission on expiry (objective 1).
 */
@Entity
@Table(name = "exam_attempts")
@Getter
@Setter
@NoArgsConstructor
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_id")
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    @Column(nullable = false)
    private Instant startedAt = Instant.now();

    @Column(nullable = false)
    private Instant deadlineAt;

    private Instant submittedAt;

    private double totalMarks;
    private double awardedMarks;
    private double scorePercent;

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<AnswerSubmission> answers = new ArrayList<>();
}
