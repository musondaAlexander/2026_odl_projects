package zm.zut.exam.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.zut.exam.domain.*;
import zm.zut.exam.dto.AnalyticsDtos.*;
import zm.zut.exam.repo.*;

import java.util.ArrayList;
import java.util.List;

/** Admin/lecturer dashboard metrics (functional requirement: participation, scores, flag rates). */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final ExamRepository exams;
    private final ExamAttemptRepository attempts;
    private final UserRepository users;
    private final QuestionRepository questions;
    private final ExamService examService;

    public AnalyticsService(ExamRepository exams, ExamAttemptRepository attempts, UserRepository users,
                            QuestionRepository questions, ExamService examService) {
        this.exams = exams;
        this.attempts = attempts;
        this.users = users;
        this.questions = questions;
        this.examService = examService;
    }

    public ExamAnalytics examAnalytics(Long examId) {
        Exam exam = examService.require(examId);
        List<ExamAttempt> list = attempts.findByExam(exam);
        long participants = list.size();
        double avgScore = list.stream().filter(a -> a.getStatus().isFinished())
                .mapToDouble(ExamAttempt::getScorePercent).average().orElse(0.0);
        long written = 0, flagged = 0;
        for (ExamAttempt a : list) {
            for (AnswerSubmission ans : a.getAnswers()) {
                if (ans.getQuestion().getType() == QuestionType.WRITTEN && ans.getPlagiarism() != null) {
                    written++;
                    if (ans.getPlagiarism().isFlagged()) flagged++;
                }
            }
        }
        double flagRate = written > 0 ? round1(flagged * 100.0 / written) : 0.0;
        return new ExamAnalytics(exam.getId(), exam.getTitle(), participants, round1(avgScore),
                flagRate, written, flagged);
    }

    public List<PlagiarismRow> plagiarismRows(Long examId) {
        Exam exam = examService.require(examId);
        List<PlagiarismRow> rows = new ArrayList<>();
        for (ExamAttempt a : attempts.findByExam(exam)) {
            for (AnswerSubmission ans : a.getAnswers()) {
                PlagiarismFlag f = ans.getPlagiarism();
                if (f != null) {
                    rows.add(new PlagiarismRow(a.getId(), a.getStudent().getFullName(), exam.getTitle(),
                            ans.getQuestion().getId(), f.getSimilarity(), f.isFlagged(),
                            f.getMatchedId(), f.getEvidence()));
                }
            }
        }
        rows.sort((x, y) -> Double.compare(y.similarity(), x.similarity()));
        return rows;
    }

    public Dashboard dashboard() {
        List<ExamAttempt> all = attempts.findAll();
        double avg = all.stream().filter(a -> a.getStatus().isFinished())
                .mapToDouble(ExamAttempt::getScorePercent).average().orElse(0.0);
        long written = 0, flagged = 0;
        for (ExamAttempt a : all) {
            for (AnswerSubmission ans : a.getAnswers()) {
                if (ans.getPlagiarism() != null) {
                    written++;
                    if (ans.getPlagiarism().isFlagged()) flagged++;
                }
            }
        }
        double flagRate = written > 0 ? round1(flagged * 100.0 / written) : 0.0;
        return new Dashboard(users.count(), users.countByRole(Role.STUDENT), users.countByRole(Role.LECTURER),
                questions.count(), exams.count(), all.size(), round1(avg), flagRate);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
