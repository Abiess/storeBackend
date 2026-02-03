package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Orchestrator service for post-create operations.
 *
 * ARCHITECTURE:
 * - This service is NOT transactional (no @Transactional annotation)
 * - It simply delegates to other services that have REQUIRES_NEW transactions
 * - Each delegated service runs in its own independent transaction
 * - NO self-invocation problem because we call OTHER beans
 *
 * WHY THIS WORKS:
 * - StoreService calls this service (bean-to-bean call → proxy works)
 * - This service calls StoreDomainCreator (bean-to-bean call → proxy works)
 * - This service calls StoreSliderInitializer (bean-to-bean call → proxy works)
 * - Each REQUIRES_NEW transaction is properly isolated
 *
 * WHY SELF-INVOCATION BREAKS REQUIRES_NEW:
 * - Spring uses proxies for @Transactional methods
 * - When you call this.method() inside the same bean, you bypass the proxy
 * - The proxy is what applies the REQUIRES_NEW behavior
 * - Result: method runs in the SAME transaction, not a new one
 * - Solution: move each REQUIRES_NEW method to its own service bean
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorePostCreateService {

    private final StoreDomainCreator domainCreator;
    private final StoreSliderInitializer sliderInitializer;

    /**
     * Executes all post-create operations safely.
     * Each operation runs in its own REQUIRES_NEW transaction via separate service beans.
     * Failures are logged but do not affect the store creation.
     *
     * @param storeId The ID of the newly created store
     * @param category The category for slider initialization
     */
    public void executePostCreateOperations(Long storeId, String category) {
        log.debug("Starting post-create operations for store {}", storeId);

        // Create subdomain in separate transaction (via StoreDomainCreator bean)
        boolean subdomainCreated = domainCreator.createDefaultSubdomain(storeId);
        if (!subdomainCreated) {
            log.warn("Subdomain creation failed for store {}, but store was created successfully", storeId);
        }

        // Initialize slider in separate transaction (via StoreSliderInitializer bean)
        boolean sliderInitialized = sliderInitializer.initializeSlider(storeId, category);
        if (!sliderInitialized) {
            log.warn("Slider initialization failed for store {}, but store was created successfully", storeId);
        }

        log.debug("Post-create operations completed for store {} (subdomain: {}, slider: {})",
                storeId, subdomainCreated, sliderInitialized);
    }
}
