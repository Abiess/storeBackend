package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.SaasProperties;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.enums.DomainType;
import storebackend.repository.DomainRepository;
import storebackend.repository.StoreRepository;

/**
 * Dedicated service for post-create operations that require separate transactions.
 *
 * WHY THIS EXISTS:
 * - Spring uses proxy-based transactions
 * - Self-invocation (calling methods within the same bean) bypasses the proxy
 * - REQUIRES_NEW doesn't work with self-invocation
 * - By moving these methods to a separate service, the proxy mechanism works correctly
 *
 * BENEFIT:
 * - If slider initialization or subdomain creation fails, the store creation still succeeds
 * - Each operation runs in its own independent transaction
 * - Clean separation of concerns
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorePostCreateService {

    private final StoreRepository storeRepository;
    private final DomainRepository domainRepository;
    private final StoreSliderService sliderService;
    private final SaasProperties saasProperties;

    /**
     * Creates default subdomain in a NEW, INDEPENDENT transaction.
     * Errors are logged but do NOT propagate to prevent affecting the store creation.
     *
     * @param storeId The ID of the store (not the entity to avoid detached entity issues)
     * @return true if successful, false if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean createDefaultSubdomain(Long storeId) {
        try {
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

            String subdomain = saasProperties.generateSubdomain(store.getSlug());

            if (domainRepository.existsByHost(subdomain)) {
                log.warn("Subdomain {} already exists, skipping creation", subdomain);
                return true; // Not an error, subdomain exists
            }

            Domain domain = new Domain();
            domain.setStore(store);
            domain.setHost(subdomain);
            domain.setType(DomainType.SUBDOMAIN);
            domain.setIsVerified(true);
            domain.setIsPrimary(true);

            domainRepository.save(domain);
            log.info("✅ Default subdomain created: {}", subdomain);
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to create default subdomain for store {}: {}", storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Initializes slider settings and images in a NEW, INDEPENDENT transaction.
     * Errors are logged but do NOT propagate to prevent affecting the store creation.
     *
     * @param storeId The ID of the store (not the entity to avoid detached entity issues)
     * @param category The category for default slider images
     * @return true if successful, false if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean initializeSlider(Long storeId, String category) {
        try {
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

            sliderService.initializeSliderForNewStore(store, category);
            log.info("✅ Slider initialized successfully for store {} with category {}", storeId, category);
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to initialize slider for store {}: {}", storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Executes both post-create operations safely.
     * This method is NOT transactional - it simply calls the transactional methods.
     * Each operation runs in its own REQUIRES_NEW transaction.
     *
     * @param storeId The ID of the newly created store
     * @param category The category for slider initialization
     */
    public void executePostCreateOperations(Long storeId, String category) {
        // Create subdomain in separate transaction
        createDefaultSubdomain(storeId);

        // Initialize slider in separate transaction
        initializeSlider(storeId, category);
    }
}
