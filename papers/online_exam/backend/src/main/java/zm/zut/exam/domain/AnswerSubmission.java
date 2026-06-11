package zm.zut.exam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A student's answer to one delivered question within an attempt. Objective
 * questions are auto-graded into {@link #awarded}/{@link #correct}; WRITTEN
 * answers carry an attached {@link PlagiarismFlag} instead.
 */
@Entity
@Table(name = "answer_submissions")
@Getter
@Setter
@NoArgsConstructor
public class AnswerSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id")
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private Question question;

    @Lob
    private String response;

    private double awarded;

    /** Null until graded; only meaningful for objective question types. */
    private Boolean correct;

    @OneToOne(mappedBy = "answer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private PlagiarismFlag plagiarism;
}
