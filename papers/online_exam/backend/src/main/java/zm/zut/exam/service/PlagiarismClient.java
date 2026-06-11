package zm.zut.exam.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import zm.zut.exam.domain.CorpusDocument;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * HTTP client for the Python TF-IDF plagiarism microservice (objective 2). The
 * NLP stack stays isolated from the JVM; if the service is unreachable the
 * analysis degrades gracefully ({@code analyzed=false}) so exam submission never
 * fails because of it. Uses the JDK HttpClient with explicit JSON headers.
 */
@Service
public class PlagiarismClient {

    private static final Logger log = LoggerFactory.getLogger(PlagiarismClient.class);

    private final String baseUrl;
    private final ObjectMapper mapper;
    // HTTP/1.1 forced: the JDK client defaults to HTTP/2 and attempts an h2c
    // upgrade on cleartext http, which uvicorn/h11 mishandles (dropping the body).
    private final HttpClient http = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public PlagiarismClient(@Value("${plagiarism.service.url}") String baseUrl, ObjectMapper mapper) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.mapper = mapper;
    }

    public record Analysis(boolean analyzed, double similarity, boolean flagged,
                           double threshold, String matchedId, String evidence) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ServiceResponse(
            @JsonProperty("max_similarity") double maxSimilarity,
            boolean flagged,
            double threshold,
            @JsonProperty("matched_id") String matchedId,
            String evidence) {}

    public Analysis analyze(String submission, List<CorpusDocument> corpus, double threshold) {
        List<Map<String, String>> corpusPayload = corpus.stream()
                .map(d -> Map.of("id", String.valueOf(d.getId()), "text", d.getContent()))
                .toList();
        Map<String, Object> body = Map.of(
                "submission", submission == null ? "" : submission,
                "corpus", corpusPayload,
                "threshold", threshold);
        try {
            String json = mapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/analyze"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Plagiarism service returned HTTP {}; degrading gracefully", response.statusCode());
                return unavailable(threshold);
            }
            ServiceResponse r = mapper.readValue(response.body(), ServiceResponse.class);
            return new Analysis(true, r.maxSimilarity(), r.flagged(), r.threshold(),
                    r.matchedId(), r.evidence());
        } catch (Exception e) {
            log.warn("Plagiarism service unavailable ({}); degrading gracefully", e.getMessage());
            return unavailable(threshold);
        }
    }

    private Analysis unavailable(double threshold) {
        return new Analysis(false, 0.0, false, threshold, null, "");
    }
}
