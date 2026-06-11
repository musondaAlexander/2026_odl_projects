package zm.zut.exam.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.Exam;
import zm.zut.exam.domain.Question;
import zm.zut.exam.domain.User;
import zm.zut.exam.dto.ExamDtos.*;
import zm.zut.exam.repo.ExamAttemptRepository;
import zm.zut.exam.repo.ExamRepository;
import zm.zut.exam.repo.QuestionRepository;
import zm.zut.exam.web.ApiException;

import java.util.HashSet;
import java.util.List;

@Service
public class ExamService {

    private final ExamRepository exams;
    private final QuestionRepository questions;
    private final ExamAttemptRepository attempts;

    public ExamService(ExamRepository exams, QuestionRepository questions, ExamAttemptRepository attempts) {
        this.exams = exams;
        this.questions = questions;
        this.attempts = attempts;
    }

    public Exam require(Long id) {
        return exams.findById(id).orElseThrow(() -> ApiException.notFound("Exam"));
    }

    /** Single exam view (loads the lazy pool inside a read transaction). */
    @Transactional(readOnly = true)
    public ExamView getView(Long id) {
        return view(require(id));
    }

    @Transactional(readOnly = true)
    public List<ExamView> listAll() {
        return exams.findAll().stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public List<ExamView> available() {
        return exams.findByPublishedTrue().stream().map(this::view).toList();
    }

    @Transactional
    public ExamView create(ExamRequest req, User creator) {
        Exam e = new Exam();
        apply(e, req);
        e.setCreatedBy(creator);
        return view(exams.save(e));
    }

    @Transactional
    public ExamView update(Long id, ExamRequest req) {
        Exam e = require(id);
        apply(e, req);
        return view(exams.save(e));
    }

    @Transactional
    public ExamView setPool(Long id, List<Long> questionIds) {
        Exam e = require(id);
        List<Question> qs = questions.findAllById(questionIds);
        if (qs.size() != questionIds.size()) {
            throw ApiException.badRequest("One or more questions do not exist");
        }
        e.setPool(new HashSet<>(qs));
        if (e.getQuestionCount() > qs.size()) {
            e.setQuestionCount(qs.size());
        }
        return view(exams.save(e));
    }

    @Transactional
    public ExamView publish(Long id, boolean published) {
        Exam e = require(id);
        if (published && e.getPool().isEmpty()) {
            throw ApiException.badRequest("Cannot publish an exam with an empty question pool");
        }
        e.setPublished(published);
        return view(exams.save(e));
    }

    private void apply(Exam e, ExamRequest req) {
        e.setTitle(req.title());
        e.setDescription(req.description());
        if (req.durationMinutes() != null && req.durationMinutes() > 0) e.setDurationMinutes(req.durationMinutes());
        if (req.questionCount() != null && req.questionCount() > 0) e.setQuestionCount(req.questionCount());
        if (req.plagiarismThreshold() != null) {
            double t = req.plagiarismThreshold();
            if (t < 0 || t > 1) throw ApiException.badRequest("Plagiarism threshold must be between 0 and 1");
            e.setPlagiarismThreshold(t);
        }
    }

    public ExamView view(Exam e) {
        return new ExamView(e.getId(), e.getTitle(), e.getDescription(), e.getDurationMinutes(),
                e.getQuestionCount(), e.getPlagiarismThreshold(), e.isPublished(),
                e.getPool().size(), attempts.countByExam(e));
    }
}
