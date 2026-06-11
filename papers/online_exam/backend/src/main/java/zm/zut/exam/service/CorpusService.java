package zm.zut.exam.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.CorpusDocument;
import zm.zut.exam.dto.CorpusDtos.*;
import zm.zut.exam.repo.CorpusDocumentRepository;
import zm.zut.exam.web.ApiException;

import java.util.List;

@Service
public class CorpusService {

    private final CorpusDocumentRepository corpus;

    public CorpusService(CorpusDocumentRepository corpus) {
        this.corpus = corpus;
    }

    public List<CorpusView> list() {
        return corpus.findAll().stream()
                .map(d -> new CorpusView(d.getId(), d.getTitle(), d.getContent().length()))
                .toList();
    }

    public List<CorpusDocument> all() {
        return corpus.findAll();
    }

    @Transactional
    public CorpusView create(CorpusRequest req) {
        CorpusDocument d = new CorpusDocument();
        d.setTitle(req.title());
        d.setContent(req.content());
        d = corpus.save(d);
        return new CorpusView(d.getId(), d.getTitle(), d.getContent().length());
    }

    @Transactional
    public void delete(Long id) {
        if (!corpus.existsById(id)) throw ApiException.notFound("Corpus document");
        corpus.deleteById(id);
    }
}
