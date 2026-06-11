package zm.zut.exam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * An examination configured by a lecturer. {@link #questionCount} questions are
 * randomly drawn from the {@link #pool} for each attempt (objective 1 — randomised
 * delivery defeats paper-sharing). {@link #plagiarismThreshold} configures the
 * TF-IDF flag cut-off for written answers (objective 2).
 */
@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private int durationMinutes = 30;

    /** Number of questions randomly delivered per attempt from the pool. */
    @Column(nullable = false)
    private int questionCount = 5;

    @Column(nullable = false)
    private double plagiarismThreshold = 0.6;

    @Column(nullable = false)
    private boolean published = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "exam_question_pool",
            joinColumns = @JoinColumn(name = "exam_id"),
            inverseJoinColumns = @JoinColumn(name = "question_id"))
    private Set<Question> pool = new HashSet<>();

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
