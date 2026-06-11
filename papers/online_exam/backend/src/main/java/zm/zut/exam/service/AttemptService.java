package zm.zut.exam.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.*;
import zm.zut.exam.dto.AttemptDtos.*;
import zm.zut.exam.repo.ExamAttemptRepository;
import zm.zut.exam.web.ApiException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * The examination engine (objective 1): starts attempts with a randomly drawn,
 * frozen question set; enforces the countdown timer and automatic submission on
 * expiry; auto-grades objective answers and routes written answers through the
 * TF-IDF plagiarism service on submission.
 */
@Service
public class AttemptService {

    private static final Logger log = LoggerFactory.getLogger(AttemptService.class);

    private final ExamAttemptRepository attempts;
    private final ExamService examService;
    private final CorpusService corpusService;
    private final GradingService grading;
    private final PlagiarismClient plagiarism;

    public AttemptService(ExamAttemptRepository attempts, ExamService examService,
                          CorpusService corpusService, GradingService grading,
                          PlagiarismClient plagiarism) {
        this.attempts = attempts;
        this.examService = examService;
        this.corpusService = corpusService;
        this.grading = grading;
        this.plagiarism = plagiarism;
    }

    // --- Student lifecycle ---------------------------------------------------

    @Transactional
    public AttemptView start(Long examId, User student) {
        Exam exam = examService.require(examId);
        if (!exam.isPublished()) {
            throw ApiException.forbidden("This exam is not open");
        }
        // Resume an active, unexpired attempt rather than starting a duplicate.
        for (ExamAttempt existing : attempts.findByExamAndStudent(exam, student)) {
            if (existing.getStatus() == AttemptStatus.IN_PROGRESS) {
                if (Instant.now().isAfter(existing.getDeadlineAt())) {
                    finalize(existing, true);
                } else {
                    return view(existing);
                }
            }
        }
        if (exam.getPool().isEmpty()) {
            throw ApiException.badRequest("Exam has no questions");
        }

        ExamAttempt attempt = new ExamAttempt();
        attempt.setExam(exam);
        attempt.setStudent(student);
        attempt.setStartedAt(Instant.now());
        attempt.setDeadlineAt(Instant.now().plus(Duration.ofMinutes(exam.getDurationMinutes())));
        attempt.setStatus(AttemptStatus.IN_PROGRESS);

        // Randomised delivery: shuffle the pool and freeze the first N questions.
        List<Question> pool = new ArrayList<>(exam.getPool());
        Collections.shuffle(pool);
        int n = Math.min(exam.getQuestionCount(), pool.size());
        for (Question q : pool.subList(0, n)) {
            AnswerSubmission ans = new AnswerSubmission();
            ans.setAttempt(attempt);
            ans.setQuestion(q);
            ans.setResponse("");
            attempt.getAnswers().add(ans);
        }
        return view(attempts.save(attempt));
    }

    @Transactional
    public AttemptView getForStudent(Long attemptId, User student) {
        ExamAttempt a = requireOwned(attemptId, student);
        if (a.getStatus() == AttemptStatus.IN_PROGRESS && Instant.now().isAfter(a.getDeadlineAt())) {
            finalize(a, true);
        }
        return view(a);
    }

    @Transactional
    public void saveAnswer(Long attemptId, User student, SaveAnswerRequest req) {
        ExamAttempt a = requireOwned(attemptId, student);
        if (a.getStatus().isFinished()) {
            throw ApiException.badRequest("Attempt already submitted");
        }
        if (Instant.now().isAfter(a.getDeadlineAt())) {
            finalize(a, true);
            throw ApiException.badRequest("Time expired; attempt auto-submitted");
        }
        AnswerSubmission target = a.getAnswers().stream()
                .filter(ans -> ans.getQuestion().getId().equals(req.questionId()))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("Question is not part of this attempt"));
        target.setResponse(req.response());
        attempts.save(a);
    }

    @Transactional
    public ResultView submit(Long attemptId, User student) {
        ExamAttempt a = requireOwned(attemptId, student);
        if (a.getStatus().isFinished()) {
            return result(a);
        }
        boolean auto = Instant.now().isAfter(a.getDeadlineAt());
        finalize(a, auto);
        return result(a);
    }

    // --- Grading + plagiarism (objectives 1 & 2) -----------------------------

    private void finalize(ExamAttempt a, boolean auto) {
        List<CorpusDocument> corpus = corpusService.all();
        double total = 0, awarded = 0;
        for (AnswerSubmission ans : a.getAnswers()) {
            Question q = ans.getQuestion();
            if (grading.isObjective(q.getType())) {
                GradingService.GradeResult gr = grading.grade(q, ans.getResponse());
                ans.setCorrect(gr.correct());
                ans.setAwarded(gr.awarded());
                total += q.getMarks();
                awarded += gr.awarded();
            } else {
                ans.setCorrect(null);
                ans.setAwarded(0);
                analyzeWritten(ans, corpus, a.getExam().getPlagiarismThreshold());
            }
        }
        a.setTotalMarks(total);
        a.setAwardedMarks(awarded);
        a.setScorePercent(total > 0 ? Math.round(awarded / total * 1000.0) / 10.0 : 0.0);
        a.setSubmittedAt(Instant.now());
        a.setStatus(auto ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED);
        attempts.save(a);
    }

    private void analyzeWritten(AnswerSubmission ans, List<CorpusDocument> corpus, double threshold) {
        if (ans.getResponse() == null || ans.getResponse().isBlank()) {
            return;
        }
        PlagiarismClient.Analysis res = plagiarism.analyze(ans.getResponse(), corpus, threshold);
        PlagiarismFlag flag = ans.getPlagiarism() != null ? ans.getPlagiarism() : new PlagiarismFlag();
        flag.setAnswer(ans);
        flag.setSimilarity(res.similarity());
        flag.setFlagged(res.flagged());
        flag.setThreshold(res.threshold());
        flag.setMatchedId(res.matchedId());
        flag.setEvidence(res.evidence());
        flag.setAnalyzed(res.analyzed());
        flag.setAnalyzedAt(Instant.now());
        ans.setPlagiarism(flag);
    }

    /** Periodically auto-submit attempts whose countdown has expired (objective 1). */
    @Scheduled(fixedDelayString = "${app.attempt.sweeper-ms}")
    @Transactional
    public void sweepExpired() {
        List<ExamAttempt> expired =
                attempts.findByStatusAndDeadlineAtBefore(AttemptStatus.IN_PROGRESS, Instant.now());
        for (ExamAttempt a : expired) {
            log.info("Auto-submitting expired attempt {}", a.getId());
            finalize(a, true);
        }
    }

    // --- Read models ---------------------------------------------------------

    @Transactional(readOnly = true)
    public ResultView resultFor(Long attemptId, User requester) {
        ExamAttempt a = attempts.findById(attemptId).orElseThrow(() -> ApiException.notFound("Attempt"));
        boolean owner = a.getStudent().getId().equals(requester.getId());
        boolean staff = requester.getRole() == Role.LECTURER || requester.getRole() == Role.ADMIN;
        if (!owner && !staff) {
            throw ApiException.forbidden("Not your attempt");
        }
        return result(a);
    }

    @Transactional(readOnly = true)
    public List<AttemptSummary> listMine(User student) {
        return attempts.findByStudentOrderByStartedAtDesc(student).stream()
                .map(a -> new AttemptSummary(a.getId(), a.getExam().getId(), a.getExam().getTitle(),
                        a.getStatus().name(), a.getScorePercent(), a.getStartedAt(), a.getSubmittedAt()))
                .toList();
    }

    private ExamAttempt requireOwned(Long attemptId, User student) {
        ExamAttempt a = attempts.findById(attemptId).orElseThrow(() -> ApiException.notFound("Attempt"));
        if (!a.getStudent().getId().equals(student.getId())) {
            throw ApiException.forbidden("Not your attempt");
        }
        return a;
    }

    private AttemptView view(ExamAttempt a) {
        long remaining = Math.max(0, Duration.between(Instant.now(), a.getDeadlineAt()).getSeconds());
        if (a.getStatus().isFinished()) remaining = 0;
        List<DeliveredQuestion> questions = a.getAnswers().stream()
                .sorted(Comparator.comparing(AnswerSubmission::getId))
                .map(ans -> {
                    Question q = ans.getQuestion();
                    return new DeliveredQuestion(q.getId(), q.getType().name(), q.getText(),
                            q.getOptions(), q.getMarks(), ans.getResponse());
                })
                .toList();
        return new AttemptView(a.getId(), a.getExam().getId(), a.getExam().getTitle(),
                a.getStatus().name(), a.getStartedAt(), a.getDeadlineAt(), remaining, questions);
    }

    private ResultView result(ExamAttempt a) {
        List<AnswerResult> answers = a.getAnswers().stream()
                .sorted(Comparator.comparing(AnswerSubmission::getId))
                .map(ans -> {
                    Question q = ans.getQuestion();
                    PlagiarismView pv = null;
                    PlagiarismFlag f = ans.getPlagiarism();
                    if (f != null) {
                        pv = new PlagiarismView(f.getSimilarity(), f.isFlagged(), f.getThreshold(),
                                f.getMatchedId(), f.getEvidence(), f.isAnalyzed());
                    }
                    return new AnswerResult(q.getId(), q.getType().name(), q.getText(),
                            ans.getResponse(), q.getCorrectAnswer(), ans.getAwarded(), q.getMarks(),
                            ans.getCorrect(), pv);
                })
                .toList();
        return new ResultView(a.getId(), a.getExam().getTitle(), a.getStudent().getFullName(),
                a.getStatus().name(), a.getAwardedMarks(), a.getTotalMarks(), a.getScorePercent(),
                a.getSubmittedAt(), answers);
    }
}
