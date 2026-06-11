package zm.zut.exam.domain;

public enum AttemptStatus {
    IN_PROGRESS,
    SUBMITTED,        // student submitted before the deadline (graded)
    AUTO_SUBMITTED;   // deadline expired; sweeper/guard finalised and graded it

    public boolean isFinished() {
        return this != IN_PROGRESS;
    }
}
