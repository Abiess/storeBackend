package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.SaasProperties;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.enums.DomainType;
import storebackend.repository.DomainRepository;
import storebackend.repository.StoreRepository;

import java.util.Optional;

/**
 * Dedicated service for creating store subdomains in an independent transaction.
 *
 * ARCHITECTURE:
 * - This service runs in its OWN transaction (REQUIRES_NEW)
 * - Separate bean = Spring proxy works correctly
 * - If subdomain creation fails, store creation is NOT affected
 *
 * ERROR HANDLING:
 * - Validates input thoroughly before attempting creation
 * - Classifies errors (transient vs permanent)
 * - Implements retry logic for transient failures
 * - Provides detailed logging for debugging
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreDomainCreator {

    private final StoreRepository storeRepository;
    private final DomainRepository domainRepository;
    private final SaasProperties saasProperties;

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 100;

    /**
     * Creates default subdomain in a NEW, INDEPENDENT transaction.
     * Errors are caught and logged but do NOT propagate.
     *
     * @param storeId The ID of the store (not the entity to avoid detached entity issues)
     * @return true if successful, false if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean createDefaultSubdomain(Long storeId) {
        // Input validation
        if (storeId == null || storeId <= 0) {
            log.error("❌ Invalid storeId: {}", storeId);
            return false;
        }

        log.info("🔄 Creating default subdomain for store ID: {}", storeId);

        try {
            return createDefaultSubdomainWithRetry(storeId, 0);
        } catch (Exception e) {
            log.error("❌ Unexpected error creating subdomain for store {}: {}",
                    storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Internal method with retry logic for transient failures.
     */
    private boolean createDefaultSubdomainWithRetry(Long storeId, int attempt) {
        try {
            return attemptSubdomainCreation(storeId);

        } catch (DataIntegrityViolationException e) {
            // Permanent error - duplicate or constraint violation
            log.error("❌ Data integrity violation for store {}: {}", storeId, e.getMessage());
            return handleDuplicateSubdomain(storeId);

        } catch (DataAccessException e) {
            // Potentially transient error - retry
            if (attempt < MAX_RETRIES && isTransientError(e)) {
                log.warn("⚠️ Transient error on attempt {} for store {}, retrying: {}",
                        attempt + 1, storeId, e.getMessage());
                return retryWithDelay(storeId, attempt);
            }

            log.error("❌ Database error for store {} after {} attempts: {}",
                    storeId, attempt + 1, e.getMessage(), e);
            return false;

        } catch (IllegalArgumentException e) {
            // Validation error - don't retry
            log.error("❌ Validation error for store {}: {}", storeId, e.getMessage());
            return false;

        } catch (Exception e) {
            // Unknown error - log and fail
            log.error("❌ Unexpected error for store {}: {}", storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Attempts to create the subdomain.
     */
    private boolean attemptSubdomainCreation(Long storeId) {
        // 1. Load store
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));

        // 2. Validate store state
        if (store.getSlug() == null || store.getSlug().trim().isEmpty()) {
            throw new IllegalArgumentException("Store slug is empty for store: " + storeId);
        }

        // 3. Generate subdomain
        String subdomain = saasProperties.generateSubdomain(store.getSlug());

        if (subdomain == null || subdomain.trim().isEmpty()) {
            throw new IllegalArgumentException("Generated subdomain is empty for store: " + storeId);
        }

        log.info("📍 Generated subdomain: {} for store: {}", subdomain, storeId);

        // 4. Check if subdomain already exists
        if (domainRepository.existsByHost(subdomain)) {
            log.warn("⚠️ Subdomain {} already exists, checking ownership", subdomain);
            return handleExistingSubdomain(storeId, subdomain);
        }

        // 5. Create new domain
        Domain domain = buildDomain(store, subdomain);

        // 6. Save and flush
        try {
            domain = domainRepository.save(domain);
            domainRepository.flush(); // Force immediate DB write to catch errors NOW

            log.info("✅ Default subdomain created successfully: {} (Domain ID: {})",
                    subdomain, domain.getId());
            return true;

        } catch (DataIntegrityViolationException e) {
            // Race condition: another process created it between our check and save
            log.warn("⚠️ Race condition detected: subdomain {} was created by another process", subdomain);
            throw e; // Let retry handler deal with it
        }
    }

    /**
     * Builds a new Domain entity.
     * Sets isPrimary=true only if this is the first domain for the store.
     */
    private Domain buildDomain(Store store, String subdomain) {
        // Prüfe ob bereits Domains für diesen Store existieren
        long existingDomainsCount = domainRepository.countByStore(store);
        boolean shouldBePrimary = (existingDomainsCount == 0);

        log.debug("📊 Store {} has {} existing domains, setting isPrimary={}",
                store.getId(), existingDomainsCount, shouldBePrimary);

        Domain domain = new Domain();
        domain.setStore(store);
        domain.setHost(subdomain);
        domain.setType(DomainType.SUBDOMAIN);
        domain.setIsVerified(true); // ✅ Subdomains sind automatisch verifiziert
        domain.setIsPrimary(shouldBePrimary); // ✅ Nur erste Domain ist primary

        return domain;
    }

    /**
     * Handles the case where the subdomain already exists.
     */
    private boolean handleExistingSubdomain(Long storeId, String subdomain) {
        Optional<Domain> existing = domainRepository.findByHost(subdomain);

        if (existing.isEmpty()) {
            // Race condition: existed during check but not now
            log.warn("⚠️ Race condition: subdomain {} disappeared after existence check", subdomain);
            return false;
        }

        Domain existingDomain = existing.get();

        // Check if it belongs to this store
        if (existingDomain.getStore() != null &&
            existingDomain.getStore().getId().equals(storeId)) {
            log.info("✅ Subdomain {} already exists for this store, marking as success", subdomain);
            return true;
        }

        log.error("❌ Subdomain {} exists but belongs to another store (Store ID: {})",
                subdomain, existingDomain.getStore() != null ? existingDomain.getStore().getId() : "null");
        return false;
    }

    /**
     * Handles duplicate subdomain errors (typically from race conditions).
     */
    private boolean handleDuplicateSubdomain(Long storeId) {
        try {
            // Reload and check if it's our domain
            Store store = storeRepository.findById(storeId).orElse(null);
            if (store == null) {
                return false;
            }

            String subdomain = saasProperties.generateSubdomain(store.getSlug());
            return handleExistingSubdomain(storeId, subdomain);

        } catch (Exception e) {
            log.error("❌ Error handling duplicate subdomain for store {}: {}",
                    storeId, e.getMessage());
            return false;
        }
    }

    /**
     * Retries with exponential backoff.
     */
    private boolean retryWithDelay(Long storeId, int attempt) {
        try {
            long delay = RETRY_DELAY_MS * (long) Math.pow(2, attempt);
            log.debug("⏳ Waiting {}ms before retry...", delay);
            Thread.sleep(delay);
            return createDefaultSubdomainWithRetry(storeId, attempt + 1);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("❌ Retry interrupted for store {}", storeId);
            return false;
        }
    }

    /**
     * Determines if an error is potentially transient.
     */
    private boolean isTransientError(Exception e) {
        String message = e.getMessage();
        if (message == null) {
            return false;
        }

        String lowerMessage = message.toLowerCase();

        // Database connection errors
        if (lowerMessage.contains("connection") ||
            lowerMessage.contains("timeout") ||
            lowerMessage.contains("deadlock") ||
            lowerMessage.contains("lock wait timeout")) {
            return true;
        }

        // Temporary unavailability
        if (lowerMessage.contains("temporarily unavailable") ||
            lowerMessage.contains("try again")) {
            return true;
        }

        return false;
    }
}
