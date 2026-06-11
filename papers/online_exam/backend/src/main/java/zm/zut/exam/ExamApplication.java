package zm.zut.exam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Online Exam &amp; Plagiarism Detection Platform — ZUCT 2026 (Group 19).
 *
 * Spring Boot 3 / Java 17 backend implementing the proposal's three objectives:
 *  1. Secure randomised examination engine with countdown timer, auto-submit and auto-grading.
 *  2. NLP TF-IDF cosine-similarity plagiarism detection (delegated to the Python microservice).
 *  3. Automated PDF report generation (iText).
 */
@SpringBootApplication
@EnableScheduling
public class ExamApplication {
    public static void main(String[] args) {
        SpringApplication.run(ExamApplication.class, args);
    }
}
