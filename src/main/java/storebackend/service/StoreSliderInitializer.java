package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Store;
import storebackend.repository.StoreRepository;

/**
 * Dedicated service for initializing store sliders in an independent transaction.
 * 
 * ARCHITECTURE:
 * - This service runs in its OWN transaction (REQUIRES_NEW)
 * - Separate bean = Spring proxy works correctly
 * - If slider initialization fails, store creation is NOT affected
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreSliderInitializer {

    private final StoreRepository storeRepository;
    private final StoreSliderService sliderService;

    /**
     * Initializes slider settings and images in a NEW, INDEPENDENT transaction.
     * Errors are caught and logged but do NOT propagate.
     * 
     * @param storeId The ID of the store (not the entity to avoid detached entity issues)
     * @param category The category for default slider images (e.g., "fashion", "electronics", "food", "general")
     * @return true if successful, false if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean initializeSlider(Long storeId, String category) {
        try {
            log.info("🔄 Initializing slider for store ID: {} with category: {}", storeId, category);

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

            sliderService.initializeSliderForNewStore(store, category);
            log.info("✅ Slider initialized successfully for store {} with category {}", storeId, category);
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to initialize slider for store {}: {}", storeId, e.getMessage(), e);
            log.error("Full error details:", e);
            // Do NOT re-throw! This would mark the transaction as rollback-only
            return false;
        }
    }
}
