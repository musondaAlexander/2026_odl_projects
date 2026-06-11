package zm.zut.exam;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import zm.zut.exam.service.PlagiarismClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** The plagiarism client must degrade gracefully when the NLP service is down. */
class PlagiarismClientTest {

    @Test
    void degradesGracefullyWhenServiceUnreachable() {
        PlagiarismClient client = new PlagiarismClient("http://localhost:1", new ObjectMapper()); // nothing listening
        PlagiarismClient.Analysis res = client.analyze("photosynthesis converts sunlight", List.of(), 0.6);
        assertFalse(res.analyzed(), "should report not-analyzed when service is unreachable");
        assertFalse(res.flagged());
        assertEquals(0.0, res.similarity());
        assertEquals(0.6, res.threshold());
    }
}
