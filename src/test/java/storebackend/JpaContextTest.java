package storebackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test that verifies the JPA context can be successfully initialized.
 * This catches mapping errors like duplicate column names.
 */
@DataJpaTest
@ActiveProfiles("test")
class JpaContextTest {

    @Test
    void contextLoads() {
        // If EntityManagerFactory creation fails, this test will fail
        assertTrue(true, "JPA context loaded successfully");
    }
}
