package zm.zut.exam.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.*;
import zm.zut.exam.repo.ExamAttemptRepository;
import zm.zut.exam.web.ApiException;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Automated PDF report generation with iText (objective 3): structured,
 * downloadable per-student attempt reports and per-exam summary reports
 * compiling results and plagiarism flags.
 */
@Service
public class ReportService {

    private static final String INSTITUTION = "Zambia University College of Technology";
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault());

    private final ExamAttemptRepository attempts;
    private final ExamService examService;

    public ReportService(ExamAttemptRepository attempts, ExamService examService) {
        this.attempts = attempts;
        this.examService = examService;
    }

    @Transactional(readOnly = true)
    public byte[] studentReport(Long attemptId, User requester) {
        ExamAttempt a = attempts.findById(attemptId).orElseThrow(() -> ApiException.notFound("Attempt"));
        boolean owner = a.getStudent().getId().equals(requester.getId());
        boolean staff = requester.getRole() == Role.LECTURER || requester.getRole() == Role.ADMIN;
        if (!owner && !staff) {
            throw ApiException.forbidden("Not your report");
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (Document doc = new Document(new PdfDocument(new PdfWriter(baos)))) {
            header(doc, "Examination Result Report");
            doc.add(new Paragraph("Student: " + a.getStudent().getFullName()));
            doc.add(new Paragraph("Examination: " + a.getExam().getTitle()));
            doc.add(new Paragraph(String.format("Status: %s    Submitted: %s",
                    a.getStatus().name(), a.getSubmittedAt() == null ? "-" : FMT.format(a.getSubmittedAt()))));
            doc.add(new Paragraph(String.format("Score (objective): %.1f / %.1f  (%.1f%%)",
                    a.getAwardedMarks(), a.getTotalMarks(), a.getScorePercent())).setBold());

            Table t = new Table(UnitValue.createPercentArray(new float[]{8, 34, 24, 16, 10, 8}))
                    .useAllAvailableWidth();
            headerRow(t, "#", "Question", "Your Answer", "Correct", "Marks", "OK");
            int i = 1;
            for (AnswerSubmission ans : a.getAnswers()) {
                Question q = ans.getQuestion();
                String correct = q.getType() == QuestionType.WRITTEN ? "(written)" : safe(q.getCorrectAnswer());
                String ok = ans.getCorrect() == null ? "-" : (ans.getCorrect() ? "Y" : "N");
                t.addCell(cell(String.valueOf(i++)));
                t.addCell(cell(trim(q.getText(), 90)));
                t.addCell(cell(trim(safe(ans.getResponse()), 70)));
                t.addCell(cell(trim(correct, 40)));
                t.addCell(cell(String.format("%.0f/%d", ans.getAwarded(), q.getMarks())));
                t.addCell(cell(ok));
            }
            doc.add(t);

            boolean anyWritten = a.getAnswers().stream().anyMatch(x -> x.getPlagiarism() != null);
            if (anyWritten) {
                doc.add(new Paragraph("\nPlagiarism analysis (written answers)").setBold());
                Table p = new Table(UnitValue.createPercentArray(new float[]{8, 14, 12, 14, 52}))
                        .useAllAvailableWidth();
                headerRow(p, "#", "Similarity", "Flagged", "Matched", "Evidence excerpt");
                int j = 1;
                for (AnswerSubmission ans : a.getAnswers()) {
                    PlagiarismFlag f = ans.getPlagiarism();
                    if (f == null) continue;
                    p.addCell(cell(String.valueOf(j++)));
                    p.addCell(cell(String.format("%.1f%%", f.getSimilarity() * 100)));
                    p.addCell(cell(f.isFlagged() ? "FLAGGED" : "clear"));
                    p.addCell(cell(safe(f.getMatchedId())));
                    p.addCell(cell(trim(safe(f.getEvidence()), 140)));
                }
                doc.add(p);
            }
            footer(doc);
        }
        return baos.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] examReport(Long examId) {
        Exam exam = examService.require(examId);
        List<ExamAttempt> list = attempts.findByExam(exam);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (Document doc = new Document(new PdfDocument(new PdfWriter(baos)))) {
            header(doc, "Examination Summary Report");
            doc.add(new Paragraph("Examination: " + exam.getTitle()).setBold());
            double avg = list.stream().filter(x -> x.getStatus().isFinished())
                    .mapToDouble(ExamAttempt::getScorePercent).average().orElse(0.0);
            long flagged = list.stream().flatMap(x -> x.getAnswers().stream())
                    .filter(x -> x.getPlagiarism() != null && x.getPlagiarism().isFlagged()).count();
            doc.add(new Paragraph(String.format("Participants: %d    Average score: %.1f%%    Plagiarism flags: %d",
                    list.size(), avg, flagged)));

            Table t = new Table(UnitValue.createPercentArray(new float[]{40, 20, 20, 20})).useAllAvailableWidth();
            headerRow(t, "Student", "Status", "Score %", "Submitted");
            for (ExamAttempt a : list) {
                t.addCell(cell(a.getStudent().getFullName()));
                t.addCell(cell(a.getStatus().name()));
                t.addCell(cell(String.format("%.1f", a.getScorePercent())));
                t.addCell(cell(a.getSubmittedAt() == null ? "-" : FMT.format(a.getSubmittedAt())));
            }
            doc.add(t);
            footer(doc);
        }
        return baos.toByteArray();
    }

    private void header(Document doc, String title) {
        doc.add(new Paragraph(INSTITUTION).setBold().setFontSize(14).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(title).setFontSize(12).setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Online Exam & Plagiarism Detection Platform")
                .setFontSize(9).setItalic().setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(" "));
    }

    private void footer(Document doc) {
        doc.add(new Paragraph("\nGenerated " + FMT.format(Instant.now())).setFontSize(8).setItalic());
    }

    private void headerRow(Table t, String... headers) {
        for (String h : headers) {
            t.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(9)));
        }
    }

    private Cell cell(String text) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(9));
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String trim(String s, int max) {
        if (s == null) return "";
        s = s.replaceAll("\\s+", " ").trim();
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
