package zm.zut.exam.web;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import zm.zut.exam.dto.ExamDtos.*;
import zm.zut.exam.security.AppUserDetails;
import zm.zut.exam.service.ExamService;

import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamService exams;

    public ExamController(ExamService exams) {
        this.exams = exams;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public List<ExamView> all() {
        return exams.listAll();
    }

    /** Published exams a student may sit. */
    @GetMapping("/available")
    public List<ExamView> available() {
        return exams.available();
    }

    @GetMapping("/{id}")
    public ExamView one(@PathVariable Long id) {
        return exams.getView(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public ExamView create(@Valid @RequestBody ExamRequest req, @AuthenticationPrincipal AppUserDetails me) {
        return exams.create(req, me.getUser());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public ExamView update(@PathVariable Long id, @Valid @RequestBody ExamRequest req) {
        return exams.update(id, req);
    }

    @PostMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public ExamView setPool(@PathVariable Long id, @RequestBody PoolRequest req) {
        return exams.setPool(id, req.questionIds());
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public ExamView publish(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean published) {
        return exams.publish(id, published);
    }
}
