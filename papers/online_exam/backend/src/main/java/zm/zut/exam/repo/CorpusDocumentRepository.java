package zm.zut.exam.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import zm.zut.exam.domain.CorpusDocument;

public interface CorpusDocumentRepository extends JpaRepository<CorpusDocument, Long> {
}
