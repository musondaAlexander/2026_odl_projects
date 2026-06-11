package zm.zut.exam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Outcome of TF-IDF plagiarism analysis on one written answer (objective 2):
 * the maximum cosine similarity against the reference corpus, whether it
 * exceeded the exam threshold, and an evidence excerpt of the closest passage.
 */
@Entity
@Table(name = "plagiarism_flags")
@Getter
@Setter
@NoArgsConstructor
public class PlagiarismFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "answer_id")
    private AnswerSubmission answer;

    private double similarity;

    private boolean flagged;

    private double threshold;

    @Column(length = 120)
    private String matchedId;

    @Lob
    private String evidence;

    /** True when the analysis ran; false if the NLP service was unavailable. */
    private boolean analyzed = true;

    @Column(nullable = false)
    private Instant analyzedAt = Instant.now();
}
