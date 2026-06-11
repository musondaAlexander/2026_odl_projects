package zm.zut.exam.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import zm.zut.exam.dto.AttemptDtos.*;
import zm.zut.exam.security.AppUserDetails;
import zm.zut.exam.service.AttemptService;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AttemptController {

    private final AttemptService attempts;

    public AttemptController(AttemptService attempts) {
        this.attempts = attempts;
    }

    @PostMapping("/exams/{examId}/start")
    @PreAuthorize("hasRole('STUDENT')")
    public AttemptView start(@PathVariable Long examId, @AuthenticationPrincipal AppUserDetails me) {
        return attempts.start(examId, me.getUser());
    }

    @GetMapping("/attempts/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public AttemptView get(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me) {
        return attempts.getForStudent(id, me.getUser());
    }

    @PostMapping("/attempts/{id}/answer")
    @PreAuthorize("hasRole('STUDENT')")
    public void answer(@PathVariable Long id, @RequestBody SaveAnswerRequest req,
                       @AuthenticationPrincipal AppUserDetails me) {
        attempts.saveAnswer(id, me.getUser(), req);
    }

    @PostMapping("/attempts/{id}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    public ResultView submit(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me) {
        return attempts.submit(id, me.getUser());
    }

    /** Result + feedback — accessible to the owning student or to staff. */
    @GetMapping("/attempts/{id}/result")
    public ResultView result(@PathVariable Long id, @AuthenticationPrincipal AppUserDetails me) {
        return attempts.resultFor(id, me.getUser());
    }

    @GetMapping("/me/attempts")
    @PreAuthorize("hasRole('STUDENT')")
    public List<AttemptSummary> mine(@AuthenticationPrincipal AppUserDetails me) {
        return attempts.listMine(me.getUser());
    }
}
