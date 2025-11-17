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

    @GetMapping
    @PreAuthorize("@storeAccessValidator.canAccessStore(#storeId, authentication)")
    public ResponseEntity<List<StructuredDataTemplateDTO>> getTemplates(@PathVariable Long storeId) {
        List<StructuredDataTemplateDTO> templates = structuredDataService.getTemplates(storeId);
        return ResponseEntity.ok(templates);
    }

    @PostMapping
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<StructuredDataTemplateDTO> createTemplate(
            @PathVariable Long storeId,
            @RequestBody StructuredDataTemplateDTO dto) {

        dto.setStoreId(storeId);
        StructuredDataTemplateDTO created = structuredDataService.saveTemplate(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

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

    @DeleteMapping("/{id}")
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable Long storeId,
            @PathVariable Long id) {

        structuredDataService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

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

