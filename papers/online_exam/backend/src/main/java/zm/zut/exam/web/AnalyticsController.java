package zm.zut.exam.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.zut.exam.dto.AnalyticsDtos.*;
import zm.zut.exam.service.AnalyticsService;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AnalyticsController {

    private final AnalyticsService analytics;

    public AnalyticsController(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/exams/{id}/analytics")
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public ExamAnalytics examAnalytics(@PathVariable Long id) {
        return analytics.examAnalytics(id);
    }

    @GetMapping("/exams/{id}/plagiarism")
    @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public List<PlagiarismRow> plagiarism(@PathVariable Long id) {
        return analytics.plagiarismRows(id);
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public Dashboard dashboard() {
        return analytics.dashboard();
    }
}
