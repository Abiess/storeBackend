package storebackend.service.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.SeoSettings;
import storebackend.repository.SeoSettingsRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeoSettingsService {

    private final SeoSettingsRepository seoSettingsRepository;

    /**
     * Get SEO settings for a store.
     */
    public Optional<SeoSettings> getSettings(Long storeId) {
        return seoSettingsRepository.findByStoreId(storeId);
    }

    /**
     * Save or update SEO settings.
     */
    @Transactional
    public SeoSettings saveSettings(SeoSettings settings) {
        return seoSettingsRepository.save(settings);
    }

    /**
     * Get or create default SEO settings for a store.
     */
    public SeoSettings getOrCreateSettings(Long storeId) {
        return seoSettingsRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    SeoSettings defaultSettings = SeoSettings.builder()
                            .storeId(storeId)
                            .sitemapEnabled(true)
                            .build();
                    return seoSettingsRepository.save(defaultSettings);
                });
    }

    /**
     * Get effective SEO settings for a store and domain.
     * Domain-specific settings would override store-level settings (future enhancement).
     */
    public SeoSettings getEffectiveSettings(Long storeId, Long domainId) {
        // For now, just return store-level settings
        // Future: could implement domain-specific overrides
        return getOrCreateSettings(storeId);
    }
}
