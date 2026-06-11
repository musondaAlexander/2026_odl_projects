package zm.zut.exam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A question in the lecturer-managed question bank. For objective types the
 * {@link #correctAnswer} drives auto-grading; for {@link QuestionType#WRITTEN}
 * it is null and the response is screened for plagiarism instead.
 */
@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionType type = QuestionType.MCQ;

    @Lob
    @Column(nullable = false)
    private String text;

    /** Choices for MCQ (ignored for other types). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_options", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "option_text", length = 500)
    private List<String> options = new ArrayList<>();

    /** Expected answer for objective grading; null for WRITTEN. */
    @Column(length = 500)
    private String correctAnswer;

    @Column(nullable = false)
    private int marks = 1;

    @Column(length = 120)
    private String topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
