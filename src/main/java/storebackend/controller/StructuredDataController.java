package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.seo.RenderStructuredDataRequest;
import storebackend.dto.seo.StructuredDataTemplateDTO;
import storebackend.service.seo.StructuredDataService;

import java.util.List;

/**
 * Controller for managing JSON-LD structured data templates.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/structured-data")
@RequiredArgsConstructor
public class StructuredDataController {

    private final StructuredDataService structuredDataService;

    /**
     * GET /api/stores/{storeId}/structured-data
     * List all templates for store.
     */
    @GetMapping
    @PreAuthorize("@storeAccessValidator.canAccessStore(#storeId, authentication)")
    public ResponseEntity<List<StructuredDataTemplateDTO>> getTemplates(@PathVariable Long storeId) {
        List<StructuredDataTemplateDTO> templates = structuredDataService.getTemplates(storeId);
        return ResponseEntity.ok(templates);
    }

    /**
     * POST /api/stores/{storeId}/structured-data
     * Create new template.
     */
    @PostMapping
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<StructuredDataTemplateDTO> createTemplate(
            @PathVariable Long storeId,
            @RequestBody StructuredDataTemplateDTO dto) {

        dto.setStoreId(storeId);
        StructuredDataTemplateDTO created = structuredDataService.saveTemplate(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/stores/{storeId}/structured-data/{id}
     * Update existing template.
     */
    @PutMapping("/{id}")
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<StructuredDataTemplateDTO> updateTemplate(
            @PathVariable Long storeId,
            @PathVariable Long id,
            @RequestBody StructuredDataTemplateDTO dto) {

        dto.setId(id);
        dto.setStoreId(storeId);
        StructuredDataTemplateDTO updated = structuredDataService.saveTemplate(dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/stores/{storeId}/structured-data/{id}
     * Delete template.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable Long storeId,
            @PathVariable Long id) {

        structuredDataService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/stores/{storeId}/structured-data/render
     * Debug endpoint: render template with test data.
     */
    @PostMapping("/render")
    @PreAuthorize("@storeAccessValidator.canAccessStore(#storeId, authentication)")
    public ResponseEntity<String> renderTemplate(
            @PathVariable Long storeId,
            @RequestBody RenderStructuredDataRequest request) {

        String rendered = structuredDataService.render(
            request.getTemplateJson(),
            request.getContext()
        );
        return ResponseEntity.ok(rendered);
    }
}
package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.seo.AssetUploadResponse;
import storebackend.dto.seo.SeoSettingsDTO;
import storebackend.entity.SeoAsset;
import storebackend.service.seo.SeoSettingsService;

/**
 * Controller for managing SEO settings per store/domain.
 * Requires store ownership or PLATFORM_ADMIN role.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/seo")
@RequiredArgsConstructor
public class SeoSettingsController {

    private final SeoSettingsService seoSettingsService;

    /**
     * GET /api/stores/{storeId}/seo?domainId=123
     * Returns effective SEO settings (domain overrides merged with store defaults).
     */
    @GetMapping
    @PreAuthorize("@storeAccessValidator.canAccessStore(#storeId, authentication)")
    public ResponseEntity<SeoSettingsDTO> getSettings(
            @PathVariable Long storeId,
            @RequestParam(required = false) Long domainId) {

        SeoSettingsDTO settings = seoSettingsService.getEffectiveSettings(storeId, domainId);
        return ResponseEntity.ok(settings);
    }

    /**
     * PUT /api/stores/{storeId}/seo
     * Update SEO settings. Include domainId in body to create domain-specific overrides.
     */
    @PutMapping
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<SeoSettingsDTO> updateSettings(
            @PathVariable Long storeId,
            @RequestBody SeoSettingsDTO dto) {

        dto.setStoreId(storeId);
        SeoSettingsDTO updated = seoSettingsService.updateSettings(dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * POST /api/stores/{storeId}/seo/assets?type=OG_IMAGE
     * Upload SEO asset (OG image, favicon) to MinIO.
     * Returns path and presigned public URL.
     */
    @PostMapping(value = "/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<AssetUploadResponse> uploadAsset(
            @PathVariable Long storeId,
            @RequestParam SeoAsset.AssetType type,
            @RequestParam("file") MultipartFile file) {

        AssetUploadResponse response = seoSettingsService.uploadAsset(storeId, type, file);
        return ResponseEntity.ok(response);
    }
}

