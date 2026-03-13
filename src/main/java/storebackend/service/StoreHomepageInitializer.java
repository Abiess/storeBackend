package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateHomepageSectionRequest;
import storebackend.entity.Store;
import storebackend.repository.StoreRepository;

/**
 * Service to initialize default homepage sections for new stores.
 * Runs in REQUIRES_NEW transaction to be independent of store creation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreHomepageInitializer {

    private final HomepageSectionService sectionService;
    private final StoreRepository storeRepository;

    /**
     * Creates default homepage sections for a new store.
     * Runs in a separate transaction (REQUIRES_NEW) to avoid affecting store creation.
     *
     * @param storeId The ID of the newly created store
     * @return true if successful, false if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean initializeHomepage(Long storeId) {
        try {
            log.info("🎨 Initializing default homepage sections for store {}", storeId);

            // Verify store exists
            Store store = storeRepository.findById(storeId).orElse(null);
            if (store == null) {
                log.error("❌ Store {} not found, cannot initialize homepage", storeId);
                return false;
            }

            // 1. Hero/Slider Section
            createSection(storeId, "HERO", 1, "{\"autoplay\": true, \"interval\": 5000}");

            // 2. Featured Products Section
            createSection(storeId, "FEATURED_PRODUCTS", 2, "{\"limit\": 8, \"productType\": \"featured\"}");

            // 3. Categories Section
            createSection(storeId, "CATEGORIES", 3, "{\"showAll\": true, \"columns\": 4}");

            // 4. Best Sellers Section
            createSection(storeId, "BEST_SELLERS", 4, "{\"limit\": 8}");

            // 5. Newsletter Section
            createSection(storeId, "NEWSLETTER", 5, "{\"buttonText\": \"Abonnieren\"}");

            log.info("✅ Successfully created 5 default homepage sections for store {}", storeId);
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to initialize homepage sections for store {}: {}", storeId, e.getMessage(), e);
            return false;
        }
    }

    private void createSection(Long storeId, String sectionType, int sortOrder, String settings) {
        try {
            CreateHomepageSectionRequest request = new CreateHomepageSectionRequest();
            request.setStoreId(storeId);
            request.setSectionType(sectionType);
            request.setIsActive(true);
            request.setSortOrder(sortOrder);
            request.setSettings(settings);

            sectionService.createSection(request);
            log.debug("✅ Created {} section for store {}", sectionType, storeId);

        } catch (Exception e) {
            log.warn("⚠️ Could not create {} section for store {}: {}", sectionType, storeId, e.getMessage());
            // Continue with next section even if one fails
        }
    }
}

