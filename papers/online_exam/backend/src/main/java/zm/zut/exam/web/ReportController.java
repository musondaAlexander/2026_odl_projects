package zm.zut.exam.web;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.zut.exam.security.AppUserDetails;
import zm.zut.exam.service.ReportService;

@RestController
@RequestMapping("/api")
public class ReportController {

    private final ReportService reports;

    public ReportController(ReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/attempts/{id}/report.pdf")
    public ResponseEntity<byte[]> studentReport(@PathVariable Long id,
                                                @AuthenticationPrincipal AppUserDetails me) {
        byte[] pdf = reports.studentReport(id, me.getUser());
        return pdf(pdf, "result-attempt-" + id + ".pdf");
    }

    @GetMapping("/exams/{id}/report.pdf")
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public ResponseEntity<byte[]> examReport(@PathVariable Long id) {
        byte[] pdf = reports.examReport(id);
        return pdf(pdf, "exam-" + id + "-summary.pdf");
    }

    private ResponseEntity<byte[]> pdf(byte[] body, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(body);
    }
}
