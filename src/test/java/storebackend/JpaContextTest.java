package storebackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import storebackend.repository.CategoryRepository;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test that verifies the JPA context can be successfully initialized.
 * This catches mapping errors like duplicate column names.
 */
@DataJpaTest
@ActiveProfiles("test")
class JpaContextTest {

    @Autowired
    private CategoryRepository categories;

    @Test
    void contextLoads() {
        // If EntityManagerFactory creation fails, this test will fail
        assertTrue(true, "JPA context loaded successfully");
    }

    @Test
    void categoryParentQueryUsesMappedRelationship() {
        assertTrue(categories.findByParentIdOrderBySortOrderAsc(-1L).isEmpty());
    }
}
