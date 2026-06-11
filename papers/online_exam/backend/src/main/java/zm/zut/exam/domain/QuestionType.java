package zm.zut.exam.domain;

/**
 * Question types. MCQ / TRUE_FALSE / SHORT_ANSWER are auto-graded objectively
 * (objective 1). WRITTEN free-text answers are not auto-scored but are run
 * through TF-IDF plagiarism analysis (objective 2).
 */
public enum QuestionType {
    MCQ,
    TRUE_FALSE,
    SHORT_ANSWER,
    WRITTEN
}
