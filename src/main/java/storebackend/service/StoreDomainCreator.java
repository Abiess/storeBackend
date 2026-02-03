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
 * Dedicated service for creating store subdomains in an independent transaction.
 *
 * ARCHITECTURE:
 * - This service runs in its OWN transaction (REQUIRES_NEW)
 * - Separate bean = Spring proxy works correctly
 * - If subdomain creation fails, store creation is NOT affected
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreDomainCreator {

    private final StoreRepository storeRepository;
    private final DomainRepository domainRepository;
    private final SaasProperties saasProperties;

    /**
     * Creates default subdomain in a NEW, INDEPENDENT transaction.
     * Errors are caught and logged but do NOT propagate.
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
            // Do NOT re-throw! This would mark the transaction as rollback-only
            return false;
        }
    }
}

