package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.seo.SeoSettingsDTO;
import storebackend.entity.SeoAsset;
import storebackend.entity.SeoSettings;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.SeoAssetRepository;
import storebackend.repository.StoreRepository;
import storebackend.service.MinioService;
import storebackend.service.seo.SeoSettingsService;
import storebackend.util.StoreAccessChecker;

import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/seo")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
@Slf4j
public class SeoSettingsController {

    private final SeoSettingsService seoSettingsService;
    private final SeoAssetRepository seoAssetRepository;
    private final StoreRepository storeRepository;
    private final MinioService minioService;

    /** GET /api/stores/{storeId}/seo */
    @GetMapping
    public ResponseEntity<?> getSeoSettings(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();
        if (!StoreAccessChecker.isOwner(store, user)) return ResponseEntity.status(403).build();

        SeoSettings settings = seoSettingsService.getOrCreateSettings(storeId);
        return ResponseEntity.ok(toDTO(settings));
    }

    /** PUT /api/stores/{storeId}/seo */
    @PutMapping
    public ResponseEntity<?> updateSeoSettings(
            @PathVariable Long storeId,
            @RequestBody SeoSettingsDTO dto,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();
        if (!StoreAccessChecker.isOwner(store, user)) return ResponseEntity.status(403).build();

        SeoSettings settings = seoSettingsService.getOrCreateSettings(storeId);
        applyDTO(dto, settings);
        SeoSettings saved = seoSettingsService.saveSettings(settings);
        log.info("SEO settings updated for store {}", storeId);
        return ResponseEntity.ok(toDTO(saved));
    }

    /** POST /api/stores/{storeId}/seo/assets?type=og-image */
    @PostMapping("/assets")
    public ResponseEntity<?> uploadSeoAsset(
            @PathVariable Long storeId,
            @RequestParam String type,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();
        if (!StoreAccessChecker.isOwner(store, user)) return ResponseEntity.status(403).build();

        try {
            // Upload via MinioService direkt (kein Medien-Limit für SEO-Assets)
            String objectName = minioService.uploadFile(file, storeId, "seo");
            String publicUrl = minioService.getPresignedUrl(objectName, 60 * 24 * 7); // 7 Tage

            // Als SeoAsset speichern
            SeoAsset asset = new SeoAsset();
            asset.setStoreId(storeId);
            asset.setType(SeoAsset.AssetType.OG_IMAGE);
            asset.setPath(publicUrl);
            asset.setSizeBytes(file.getSize());
            seoAssetRepository.save(asset);

            return ResponseEntity.ok(Map.of(
                "id", asset.getId() != null ? asset.getId() : 0,
                "path", publicUrl,
                "publicUrl", publicUrl,
                "sizeBytes", file.getSize()
            ));
        } catch (Exception e) {
            log.error("SEO asset upload failed for store {}: {}", storeId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload fehlgeschlagen: " + e.getMessage()));
        }
    }

    // ── Mapping helpers ──────────────────────────────────────────────────────

    private SeoSettingsDTO toDTO(SeoSettings s) {
        return SeoSettingsDTO.builder()
                .id(s.getId())
                .storeId(s.getStoreId())
                .siteName(s.getSiteName())
                .metaTitle(s.getMetaTitle())
                .defaultTitleTemplate(s.getDefaultTitleTemplate())
                .defaultMetaDescription(s.getMetaDescription())
                .defaultMetaKeywords(s.getMetaKeywords())
                .canonicalBaseUrl(s.getCanonicalBaseUrl())
                .ogDefaultImageUrl(s.getOgImageUrl())
                .ogDefaultImagePath(s.getOgDefaultImagePath())
                .twitterHandle(s.getTwitterHandle())
                .facebookPageUrl(s.getFacebookPageUrl())
                .instagramUrl(s.getInstagramUrl())
                .youtubeUrl(s.getYoutubeUrl())
                .linkedinUrl(s.getLinkedinUrl())
                .robotsIndex(s.getRobotsIndex())
                .enableSitemapXml(s.getSitemapEnabled())
                .robotsTxtContent(s.getRobotsTxt())
                .hreflangConfigJson(s.getHreflangConfig())
                .build();
    }

    private void applyDTO(SeoSettingsDTO dto, SeoSettings s) {
        if (dto.getSiteName() != null)             s.setSiteName(dto.getSiteName());
        if (dto.getMetaTitle() != null)            s.setMetaTitle(dto.getMetaTitle());
        if (dto.getDefaultTitleTemplate() != null) s.setDefaultTitleTemplate(dto.getDefaultTitleTemplate());
        if (dto.getDefaultMetaDescription() != null) s.setMetaDescription(dto.getDefaultMetaDescription());
        if (dto.getDefaultMetaKeywords() != null)  s.setMetaKeywords(dto.getDefaultMetaKeywords());
        if (dto.getCanonicalBaseUrl() != null)     s.setCanonicalBaseUrl(dto.getCanonicalBaseUrl());
        if (dto.getOgDefaultImageUrl() != null)    s.setOgImageUrl(dto.getOgDefaultImageUrl());
        if (dto.getOgDefaultImagePath() != null)   s.setOgDefaultImagePath(dto.getOgDefaultImagePath());
        if (dto.getTwitterHandle() != null)        s.setTwitterHandle(dto.getTwitterHandle());
        if (dto.getFacebookPageUrl() != null)      s.setFacebookPageUrl(dto.getFacebookPageUrl());
        if (dto.getInstagramUrl() != null)         s.setInstagramUrl(dto.getInstagramUrl());
        if (dto.getYoutubeUrl() != null)           s.setYoutubeUrl(dto.getYoutubeUrl());
        if (dto.getLinkedinUrl() != null)          s.setLinkedinUrl(dto.getLinkedinUrl());
        if (dto.getRobotsIndex() != null)          s.setRobotsIndex(dto.getRobotsIndex());
        if (dto.getEnableSitemapXml() != null)     s.setSitemapEnabled(dto.getEnableSitemapXml());
        if (dto.getRobotsTxtContent() != null)     s.setRobotsTxt(dto.getRobotsTxtContent());
        if (dto.getHreflangConfigJson() != null)   s.setHreflangConfig(dto.getHreflangConfigJson());
    }
}

