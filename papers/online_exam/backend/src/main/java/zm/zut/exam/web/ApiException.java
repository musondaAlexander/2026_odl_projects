package zm.zut.exam.web;

import org.springframework.http.HttpStatus;

/** A request-level error carrying the HTTP status to return. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, what + " not found");
    }

    public static ApiException badRequest(String msg) {
        return new ApiException(HttpStatus.BAD_REQUEST, msg);
    }

    public static ApiException forbidden(String msg) {
        return new ApiException(HttpStatus.FORBIDDEN, msg);
    }
}
