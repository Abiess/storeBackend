package storebackend.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import storebackend.dto.analytics.TopProductDTO;
import storebackend.enums.PaymentStatus;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for OrderItemRepository Analytics Queries
 * 
 * Validates that JPQL queries are correctly formed and execute against real JPA context
 * 
 * WICHTIG: Dieser Test validiert die JPQL-Query zur Compile-Zeit gegen das JPA-Metamodel
 */
@DataJpaTest
class OrderItemRepositoryAnalyticsTest {

    @Autowired
    private OrderItemRepository orderItemRepository;

    /**
     * Test 1: Context loads and repository is available
     * 
     * Dieser Test validiert bereits die JPQL-Syntax!
     * Wenn die Query fehlerhaft ist, schlägt der Context-Start fehl.
     */
    @Test
    void contextLoadsAndTopProductsQueryIsValid() {
        assertThat(orderItemRepository).isNotNull();
        // Wenn dieser Test durchläuft, ist die JPQL-Query syntaktisch korrekt
    }

    /**
     * Test 2: Query executes without errors (empty result)
     */
    @Test
    void findTopProductsByRevenue_EmptyDatabase_ReturnsEmptyList() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 5);
        LocalDateTime from = LocalDateTime.now().minusDays(30);
        LocalDateTime to = LocalDateTime.now();

        // Act
        List<TopProductDTO> result = orderItemRepository.findTopProductsByRevenue(
            999L,  // Non-existent store
            PaymentStatus.PAID,
            from,
            to,
            pageable
        );

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }
}
