package storebackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class StoreBackendApplicationTests {

    @Test
    void contextLoads() {
        // Verify that the application context loads successfully
        // This test ensures all beans are properly configured
    }

    @Test
    void applicationStartsWithTestProfile() {
        // This test verifies that the application can start with test profile
        // which uses H2 in-memory database for testing
    }
}
