package zm.zut.exam.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.Question;
import zm.zut.exam.domain.QuestionType;
import zm.zut.exam.domain.User;
import zm.zut.exam.dto.QuestionDtos.*;
import zm.zut.exam.repo.QuestionRepository;
import zm.zut.exam.web.ApiException;

import java.util.ArrayList;
import java.util.List;

@Service
public class QuestionService {

    private final QuestionRepository questions;

    public QuestionService(QuestionRepository questions) {
        this.questions = questions;
    }

    public List<QuestionView> list() {
        return questions.findAll().stream().map(QuestionService::view).toList();
    }

    @Transactional
    public QuestionView create(QuestionRequest req, User creator) {
        Question q = new Question();
        apply(q, req);
        q.setCreatedBy(creator);
        return view(questions.save(q));
    }

    @Transactional
    public QuestionView update(Long id, QuestionRequest req) {
        Question q = questions.findById(id).orElseThrow(() -> ApiException.notFound("Question"));
        apply(q, req);
        return view(questions.save(q));
    }

    @Transactional
    public void delete(Long id) {
        if (!questions.existsById(id)) throw ApiException.notFound("Question");
        questions.deleteById(id);
    }

    private void apply(Question q, QuestionRequest req) {
        QuestionType type = parseType(req.type());
        q.setType(type);
        q.setText(req.text());
        q.setOptions(req.options() == null ? new ArrayList<>() : new ArrayList<>(req.options()));
        q.setCorrectAnswer(type == QuestionType.WRITTEN ? null : req.correctAnswer());
        q.setMarks(req.marks() == null || req.marks() < 1 ? 1 : req.marks());
        q.setTopic(req.topic());
        if (type != QuestionType.WRITTEN && (req.correctAnswer() == null || req.correctAnswer().isBlank())) {
            throw ApiException.badRequest("Objective questions require a correct answer");
        }
        if (type == QuestionType.MCQ && q.getOptions().size() < 2) {
            throw ApiException.badRequest("MCQ questions require at least two options");
        }
    }

    static QuestionType parseType(String raw) {
        try {
            return QuestionType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw ApiException.badRequest("Unknown question type: " + raw);
        }
    }

    static QuestionView view(Question q) {
        return new QuestionView(q.getId(), q.getType().name(), q.getText(),
                q.getOptions(), q.getCorrectAnswer(), q.getMarks(), q.getTopic());
    }
}
