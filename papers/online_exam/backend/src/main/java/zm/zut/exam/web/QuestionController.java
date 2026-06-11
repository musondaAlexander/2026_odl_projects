package zm.zut.exam.web;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import zm.zut.exam.dto.QuestionDtos.*;
import zm.zut.exam.security.AppUserDetails;
import zm.zut.exam.service.QuestionService;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
public class QuestionController {

    private final QuestionService questions;

    public QuestionController(QuestionService questions) {
        this.questions = questions;
    }

    @GetMapping
    public List<QuestionView> list() {
        return questions.list();
    }

    @PostMapping
    public QuestionView create(@Valid @RequestBody QuestionRequest req,
                               @AuthenticationPrincipal AppUserDetails me) {
        return questions.create(req, me.getUser());
    }

    @PutMapping("/{id}")
    public QuestionView update(@PathVariable Long id, @Valid @RequestBody QuestionRequest req) {
        return questions.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        questions.delete(id);
    }
}
