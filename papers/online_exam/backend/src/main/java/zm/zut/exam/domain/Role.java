package zm.zut.exam.domain;

/** RBAC roles. Authorities are exposed to Spring Security as {@code ROLE_<name>}. */
public enum Role {
    STUDENT,
    LECTURER,
    ADMIN
}
