package storebackend.service.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.seo.RedirectResolveResponse;
import storebackend.dto.seo.RedirectRuleDTO;
import storebackend.entity.RedirectRule;
import storebackend.repository.RedirectRuleRepository;

import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Service for managing URL redirects with regex support and priority ordering.
 * Caches active rules per domain; domain-specific rules override store-level.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RedirectService {

    private final RedirectRuleRepository redirectRuleRepository;

    /**
     * Resolve redirect for given path. Returns first matching rule by priority.
     * Cached per store/domain combination.
     */
    @Cacheable(value = "redirectRules", key = "#storeId + '_' + (#domainId ?: 'default')")
    public List<RedirectRule> getActiveRules(Long storeId, Long domainId) {
        return redirectRuleRepository.findActiveRulesForStoreAndDomain(storeId, domainId);
    }

    /**
     * Resolve redirect for a given path using cached rules.
     */
    public RedirectResolveResponse resolve(Long storeId, Long domainId, String path) {
        List<RedirectRule> rules = getActiveRules(storeId, domainId);

        for (RedirectRule rule : rules) {
            if (matches(rule, path)) {
                log.debug("Redirect match: {} -> {} ({})", path, rule.getTargetUrl(), rule.getHttpCode());
                return RedirectResolveResponse.builder()
                        .targetUrl(rule.getTargetUrl())
                        .httpCode(rule.getHttpCode())
                        .found(true)
                        .build();
            }
        }

        return RedirectResolveResponse.builder()
                .found(false)
                .build();
    }

    /**
     * Get all redirect rules with filtering and pagination.
     */
    public Page<RedirectRuleDTO> getRules(Long storeId, Long domainId, String query, Pageable pageable) {
        return redirectRuleRepository.findByStoreIdAndFilters(storeId, domainId, query, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Create new redirect rule with validation.
     */
    @Transactional
    @CacheEvict(value = "redirectRules", key = "#dto.storeId + '_' + (#dto.domainId ?: 'default')")
    public RedirectRuleDTO createRule(RedirectRuleDTO dto) {
        validateRule(dto);

        RedirectRule entity = RedirectRule.builder()
                .storeId(dto.getStoreId())
                .domainId(dto.getDomainId())
                .sourcePath(dto.getSourcePath())
                .targetUrl(dto.getTargetUrl())
                .httpCode(dto.getHttpCode())
                .isRegex(dto.getIsRegex())
                .priority(dto.getPriority())
                .isActive(dto.getIsActive())
                .comment(dto.getComment())
                .tag(dto.getTag())
                .build();

        entity = redirectRuleRepository.save(entity);
        return mapToDTO(entity);
    }

    /**
     * Update existing redirect rule.
     */
    @Transactional
    @CacheEvict(value = "redirectRules", key = "#dto.storeId + '_' + (#dto.domainId ?: 'default')")
    public RedirectRuleDTO updateRule(Long id, RedirectRuleDTO dto) {
        RedirectRule entity = redirectRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Redirect rule not found: " + id));

        validateRule(dto);

        entity.setSourcePath(dto.getSourcePath());
        entity.setTargetUrl(dto.getTargetUrl());
        entity.setHttpCode(dto.getHttpCode());
        entity.setIsRegex(dto.getIsRegex());
        entity.setPriority(dto.getPriority());
        entity.setIsActive(dto.getIsActive());
        entity.setComment(dto.getComment());
        entity.setTag(dto.getTag());

        entity = redirectRuleRepository.save(entity);
        return mapToDTO(entity);
    }

    /**
     * Delete redirect rule.
     */
    @Transactional
    @CacheEvict(value = "redirectRules", allEntries = true)
    public void deleteRule(Long id) {
        redirectRuleRepository.deleteById(id);
    }

    /**
     * Manual cache refresh endpoint.
     */
    @CacheEvict(value = "redirectRules", allEntries = true)
    public void refreshCache() {
        log.info("Redirect rules cache refreshed");
    }

    /**
     * Check if path matches rule (exact or regex).
     */
    private boolean matches(RedirectRule rule, String path) {
        if (rule.getIsRegex()) {
            try {
                Pattern pattern = Pattern.compile(rule.getSourcePath());
                return pattern.matcher(path).matches();
            } catch (PatternSyntaxException e) {
                log.error("Invalid regex pattern in rule {}: {}", rule.getId(), rule.getSourcePath(), e);
                return false;
            }
        } else {
            return rule.getSourcePath().equals(path);
        }
    }

    private void validateRule(RedirectRuleDTO dto) {
        // Source path must start with "/" unless regex
        if (!dto.getIsRegex() && !dto.getSourcePath().startsWith("/")) {
            throw new IllegalArgumentException("Source path must start with '/'");
        }

        // Validate regex pattern if regex mode
        if (dto.getIsRegex()) {
            try {
                Pattern.compile(dto.getSourcePath());
            } catch (PatternSyntaxException e) {
                throw new IllegalArgumentException("Invalid regex pattern: " + e.getMessage());
            }
        }

        // Validate HTTP code
        if (dto.getHttpCode() != 301 && dto.getHttpCode() != 302) {
            throw new IllegalArgumentException("HTTP code must be 301 or 302");
        }
    }

    private RedirectRuleDTO mapToDTO(RedirectRule entity) {
        return RedirectRuleDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStoreId())
                .domainId(entity.getDomainId())
                .sourcePath(entity.getSourcePath())
                .targetUrl(entity.getTargetUrl())
                .httpCode(entity.getHttpCode())
                .isRegex(entity.getIsRegex())
                .priority(entity.getPriority())
                .isActive(entity.getIsActive())
                .comment(entity.getComment())
                .tag(entity.getTag())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
package storebackend.service.seo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.seo.AssetUploadResponse;
import storebackend.dto.seo.SeoSettingsDTO;
import storebackend.entity.SeoAsset;
import storebackend.entity.SeoSettings;
import storebackend.repository.SeoAssetRepository;
import storebackend.repository.SeoSettingsRepository;
import storebackend.service.MinioStorageService;

import java.util.stream.Collectors;

/**
 * Service for managing SEO settings per store/domain.
 * Implements effective settings merging: domain-specific overrides store-level.
 * Uses caching with version-based invalidation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SeoSettingsService {

    private final SeoSettingsRepository seoSettingsRepository;
    private final SeoAssetRepository seoAssetRepository;
    private final MinioStorageService minioStorageService;

    /**
     * Get effective SEO settings with domain override logic.
     * Cached per store/domain combination.
     */
    @Cacheable(value = "seoSettings", key = "#storeId + '_' + (#domainId ?: 'default')")
    public SeoSettingsDTO getEffectiveSettings(Long storeId, Long domainId) {
        SeoSettings domainSettings = null;
        if (domainId != null) {
            domainSettings = seoSettingsRepository.findByStoreIdAndDomainId(storeId, domainId).orElse(null);
        }

        SeoSettings storeSettings = seoSettingsRepository.findByStoreIdAndDomainIdIsNull(storeId)
                .orElse(createDefaultSettings(storeId));

        // Merge: domain-specific overrides store-level
        SeoSettings effective = domainSettings != null ? mergeSettings(storeSettings, domainSettings) : storeSettings;

        return mapToDTO(effective);
    }

    /**
     * Update SEO settings. If domainId is provided, creates/updates domain-specific settings.
     */
    @Transactional
    @CacheEvict(value = "seoSettings", key = "#dto.storeId + '_' + (#dto.domainId ?: 'default')")
    public SeoSettingsDTO updateSettings(SeoSettingsDTO dto) {
        validateSettings(dto);

        SeoSettings entity;
        if (dto.getDomainId() != null) {
            entity = seoSettingsRepository.findByStoreIdAndDomainId(dto.getStoreId(), dto.getDomainId())
                    .orElse(new SeoSettings());
        } else {
            entity = seoSettingsRepository.findByStoreIdAndDomainIdIsNull(dto.getStoreId())
                    .orElse(new SeoSettings());
        }

        entity.setStoreId(dto.getStoreId());
        entity.setDomainId(dto.getDomainId());
        entity.setSiteName(dto.getSiteName());
        entity.setDefaultTitleTemplate(dto.getDefaultTitleTemplate());
        entity.setDefaultMetaDescription(dto.getDefaultMetaDescription());
        entity.setCanonicalBaseUrl(dto.getCanonicalBaseUrl());
        entity.setRobotsIndex(dto.getRobotsIndex());
        entity.setOgDefaultImagePath(dto.getOgDefaultImagePath());
        entity.setTwitterHandle(dto.getTwitterHandle());
        entity.setFacebookPageUrl(dto.getFacebookPageUrl());
        entity.setInstagramUrl(dto.getInstagramUrl());
        entity.setYoutubeUrl(dto.getYoutubeUrl());
        entity.setLinkedinUrl(dto.getLinkedinUrl());

        if (dto.getHreflangConfig() != null) {
            entity.setHreflangConfig(dto.getHreflangConfig().stream()
                    .map(h -> new SeoSettings.HreflangEntry(h.getLangCode(), h.getAbsoluteUrlBase()))
                    .collect(Collectors.toList()));
        }

        entity = seoSettingsRepository.save(entity);
        return mapToDTO(entity);
    }

    /**
     * Upload SEO asset (OG image, favicon, etc.) to MinIO.
     */
    @Transactional
    public AssetUploadResponse uploadAsset(Long storeId, SeoAsset.AssetType type, MultipartFile file) {
        String path = "store-" + storeId + "/seo/" + type.name().toLowerCase() + "/" + file.getOriginalFilename();

        try {
            minioStorageService.uploadFile(file, path);
            String publicUrl = minioStorageService.getPresignedUrl(path, 7 * 24 * 3600); // 7 days

            SeoAsset asset = SeoAsset.builder()
                    .storeId(storeId)
                    .type(type)
                    .path(path)
                    .sizeBytes(file.getSize())
                    .build();

            asset = seoAssetRepository.save(asset);

            return AssetUploadResponse.builder()
                    .id(asset.getId())
                    .path(path)
                    .publicUrl(publicUrl)
                    .sizeBytes(file.getSize())
                    .build();
        } catch (Exception e) {
            log.error("Failed to upload SEO asset for store {}", storeId, e);
            throw new RuntimeException("Asset upload failed: " + e.getMessage());
        }
    }

    private SeoSettings createDefaultSettings(Long storeId) {
        return SeoSettings.builder()
                .storeId(storeId)
                .siteName("My Store")
                .defaultTitleTemplate("{{page.title}} | {{store.siteName}}")
                .defaultMetaDescription("Welcome to our store")
                .canonicalBaseUrl("https://store-" + storeId + ".markt.ma")
                .robotsIndex(true)
                .build();
    }

    private SeoSettings mergeSettings(SeoSettings base, SeoSettings override) {
        SeoSettings merged = new SeoSettings();
        merged.setStoreId(base.getStoreId());
        merged.setDomainId(override.getDomainId());
        merged.setSiteName(override.getSiteName() != null ? override.getSiteName() : base.getSiteName());
        merged.setDefaultTitleTemplate(override.getDefaultTitleTemplate() != null ? override.getDefaultTitleTemplate() : base.getDefaultTitleTemplate());
        merged.setDefaultMetaDescription(override.getDefaultMetaDescription() != null ? override.getDefaultMetaDescription() : base.getDefaultMetaDescription());
        merged.setCanonicalBaseUrl(override.getCanonicalBaseUrl() != null ? override.getCanonicalBaseUrl() : base.getCanonicalBaseUrl());
        merged.setRobotsIndex(override.getRobotsIndex() != null ? override.getRobotsIndex() : base.getRobotsIndex());
        merged.setOgDefaultImagePath(override.getOgDefaultImagePath() != null ? override.getOgDefaultImagePath() : base.getOgDefaultImagePath());
        merged.setTwitterHandle(override.getTwitterHandle() != null ? override.getTwitterHandle() : base.getTwitterHandle());
        merged.setFacebookPageUrl(override.getFacebookPageUrl() != null ? override.getFacebookPageUrl() : base.getFacebookPageUrl());
        merged.setInstagramUrl(override.getInstagramUrl() != null ? override.getInstagramUrl() : base.getInstagramUrl());
        merged.setYoutubeUrl(override.getYoutubeUrl() != null ? override.getYoutubeUrl() : base.getYoutubeUrl());
        merged.setLinkedinUrl(override.getLinkedinUrl() != null ? override.getLinkedinUrl() : base.getLinkedinUrl());
        merged.setHreflangConfig(!override.getHreflangConfig().isEmpty() ? override.getHreflangConfig() : base.getHreflangConfig());
        merged.setVersion(override.getVersion());
        return merged;
    }

    private SeoSettingsDTO mapToDTO(SeoSettings entity) {
        String publicUrl = null;
        if (entity.getOgDefaultImagePath() != null) {
            try {
                publicUrl = minioStorageService.getPresignedUrl(entity.getOgDefaultImagePath(), 7 * 24 * 3600);
            } catch (Exception e) {
                log.warn("Failed to get presigned URL for {}", entity.getOgDefaultImagePath());
            }
        }

        return SeoSettingsDTO.builder()
                .id(entity.getId())
                .storeId(entity.getStoreId())
                .domainId(entity.getDomainId())
                .siteName(entity.getSiteName())
                .defaultTitleTemplate(entity.getDefaultTitleTemplate())
                .defaultMetaDescription(entity.getDefaultMetaDescription())
                .canonicalBaseUrl(entity.getCanonicalBaseUrl())
                .robotsIndex(entity.getRobotsIndex())
                .ogDefaultImagePath(entity.getOgDefaultImagePath())
                .ogDefaultImageUrl(publicUrl)
                .twitterHandle(entity.getTwitterHandle())
                .facebookPageUrl(entity.getFacebookPageUrl())
                .instagramUrl(entity.getInstagramUrl())
                .youtubeUrl(entity.getYoutubeUrl())
                .linkedinUrl(entity.getLinkedinUrl())
                .hreflangConfig(entity.getHreflangConfig().stream()
                        .map(h -> new SeoSettingsDTO.HreflangEntryDTO(h.getLangCode(), h.getAbsoluteUrlBase()))
                        .collect(Collectors.toList()))
                .version(entity.getVersion())
                .build();
    }

    private void validateSettings(SeoSettingsDTO dto) {
        if (dto.getCanonicalBaseUrl() != null && !dto.getCanonicalBaseUrl().startsWith("https://")) {
            throw new IllegalArgumentException("Canonical base URL must be absolute HTTPS URL");
        }
    }
}

