package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Store;
import storebackend.entity.StoreTheme;
import storebackend.enums.BusinessType;
import storebackend.repository.StoreRepository;
import storebackend.repository.StoreThemeRepository;

/**
 * Dedicated service for initializing default store themes in an independent transaction.
 * 
 * ARCHITECTURE:
 * - This service runs in its OWN transaction (REQUIRES_NEW)
 * - Separate bean = Spring proxy works correctly
 * - If theme initialization fails, store creation is NOT affected
 * 
 * BUSINESS LOGIC:
 * - Creates a default theme based on store's BusinessType
 * - Only creates theme if store has NO existing themes
 * - Never overwrites existing user-selected themes
 * - BusinessType and template remain separate concepts (user can change template later)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoreThemeInitializer {

    private final StoreRepository storeRepository;
    private final StoreThemeRepository themeRepository;

    /**
     * Initializes default theme in a NEW, INDEPENDENT transaction.
     * Errors are caught and logged but do NOT propagate.
     * 
     * Default template mapping:
     * - SHOP → MODERN_GRID
     * - RESTAURANT → RESTAURANT_WARM
     * - RIAD → RESTAURANT_WARM
     * - SERVICE → SERVICE_PROFESSIONAL
     * 
     * @param storeId The ID of the store
     * @return true if successful or theme already exists, false if failed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean initializeDefaultTheme(Long storeId) {
        try {
            log.info("🔄 Initializing default theme for store ID: {}", storeId);

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

            // Check if theme already exists - NEVER overwrite existing themes
            if (!themeRepository.findByStoreId(storeId).isEmpty()) {
                log.info("ℹ️ Store {} already has theme(s), skipping initialization", storeId);
                return true;
            }

            // Determine default template based on BusinessType
            String template = getDefaultTemplate(store.getBusinessType());
            
            // Create default theme
            StoreTheme theme = new StoreTheme();
            theme.setStore(store);
            theme.setName("Default Theme");
            theme.setType("CUSTOM");
            theme.setTemplate(template);
            theme.setIsActive(true);
            // colorsJson, typographyJson, layoutJson, customCss remain null (template defaults)
            
            themeRepository.save(theme);
            log.info("✅ Default theme created for store {} (BusinessType: {}, Template: {})", 
                    storeId, store.getBusinessType(), template);
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to initialize theme for store {}: {}", storeId, e.getMessage(), e);
            // Do NOT re-throw! This would mark the transaction as rollback-only
            return false;
        }
    }

    /**
     * Maps BusinessType to default template.
     * User can change template later - this is just the initial default.
     */
    private String getDefaultTemplate(BusinessType businessType) {
        return switch (businessType) {
            case SERVICE -> "SERVICE_PROFESSIONAL";
            case RESTAURANT, RIAD -> "RESTAURANT_WARM";
            default -> "MODERN_GRID"; // SHOP + fallback
        };
    }
}
