package zm.zut.exam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A reference document forming the corpus that written submissions are compared
 * against by the TF-IDF plagiarism service (objective 2).
 */
@Entity
@Table(name = "corpus_documents")
@Getter
@Setter
@NoArgsConstructor
public class CorpusDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 250)
    private String title;

    @Lob
    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
