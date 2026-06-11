package zm.zut.exam.web;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import zm.zut.exam.dto.CorpusDtos.*;
import zm.zut.exam.service.CorpusService;

import java.util.List;

@RestController
@RequestMapping("/api/corpus")
@PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
public class CorpusController {

    private final CorpusService corpus;

    public CorpusController(CorpusService corpus) {
        this.corpus = corpus;
    }

    @GetMapping
    public List<CorpusView> list() {
        return corpus.list();
    }

    @PostMapping
    public CorpusView create(@Valid @RequestBody CorpusRequest req) {
        return corpus.create(req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        corpus.delete(id);
    }
}
