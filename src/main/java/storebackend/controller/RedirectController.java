package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.seo.RedirectResolveResponse;
import storebackend.dto.seo.RedirectRuleDTO;
import storebackend.service.seo.RedirectService;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for managing URL redirect rules.
 * Supports CRUD, CSV import/export, and runtime resolution.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/redirects")
@RequiredArgsConstructor
public class RedirectController {

    private final RedirectService redirectService;

    /**
     * GET /api/stores/{storeId}/redirects?domainId=&query=&page=0&size=20
     * List redirect rules with filtering and pagination.
     */
    @GetMapping
    @PreAuthorize("@storeAccessValidator.canAccessStore(#storeId, authentication)")
    public ResponseEntity<Page<RedirectRuleDTO>> getRules(
            @PathVariable Long storeId,
            @RequestParam(required = false) Long domainId,
            @RequestParam(required = false) String query,
            Pageable pageable) {

        Page<RedirectRuleDTO> rules = redirectService.getRules(storeId, domainId, query, pageable);
        return ResponseEntity.ok(rules);
    }

    /**
     * POST /api/stores/{storeId}/redirects
     * Create new redirect rule.
     */
    @PostMapping
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<RedirectRuleDTO> createRule(
            @PathVariable Long storeId,
            @RequestBody RedirectRuleDTO dto) {

        dto.setStoreId(storeId);
        RedirectRuleDTO created = redirectService.createRule(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/stores/{storeId}/redirects/{id}
     * Update existing redirect rule.
     */
    @PutMapping("/{id}")
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<RedirectRuleDTO> updateRule(
            @PathVariable Long storeId,
            @PathVariable Long id,
            @RequestBody RedirectRuleDTO dto) {

        dto.setStoreId(storeId);
        RedirectRuleDTO updated = redirectService.updateRule(id, dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/stores/{storeId}/redirects/{id}
     * Delete redirect rule.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<Void> deleteRule(
            @PathVariable Long storeId,
            @PathVariable Long id) {

        redirectService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/stores/{storeId}/redirects/import
     * Import redirects from CSV file.
     * Format: sourcePath,httpCode,targetUrl,isRegex,priority,comment
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<ImportResult> importRules(
            @PathVariable Long storeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long domainId) {

        try {
            List<RedirectRuleDTO> imported = new ArrayList<>();
            List<String> errors = new ArrayList<>();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));

            String line;
            int lineNum = 0;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                if (lineNum == 1 && line.startsWith("sourcePath")) continue; // Skip header

                String[] parts = line.split(",", -1);
                if (parts.length < 3) {
                    errors.add("Line " + lineNum + ": Invalid format");
                    continue;
                }

                try {
                    RedirectRuleDTO dto = RedirectRuleDTO.builder()
                            .storeId(storeId)
                            .domainId(domainId)
                            .sourcePath(parts[0].trim())
                            .httpCode(parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 301)
                            .targetUrl(parts[2].trim())
                            .isRegex(parts.length > 3 ? Boolean.parseBoolean(parts[3].trim()) : false)
                            .priority(parts.length > 4 ? Integer.parseInt(parts[4].trim()) : 100)
                            .comment(parts.length > 5 ? parts[5].trim() : null)
                            .isActive(true)
                            .build();

                    RedirectRuleDTO created = redirectService.createRule(dto);
                    imported.add(created);
                } catch (Exception e) {
                    errors.add("Line " + lineNum + ": " + e.getMessage());
                }
            }

            return ResponseEntity.ok(new ImportResult(imported.size(), errors));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ImportResult(0, List.of("Import failed: " + e.getMessage())));
        }
    }

    /**
     * GET /api/stores/{storeId}/redirects/export
     * Export all redirects as CSV.
     */
    @GetMapping("/export")
    @PreAuthorize("@storeAccessValidator.canAccessStore(#storeId, authentication)")
    public ResponseEntity<String> exportRules(
            @PathVariable Long storeId,
            @RequestParam(required = false) Long domainId) {

        Page<RedirectRuleDTO> rules = redirectService.getRules(storeId, domainId, null, Pageable.unpaged());

        StringBuilder csv = new StringBuilder();
        csv.append("sourcePath,httpCode,targetUrl,isRegex,priority,comment\n");

        rules.forEach(rule -> {
            csv.append(rule.getSourcePath()).append(",")
               .append(rule.getHttpCode()).append(",")
               .append(rule.getTargetUrl()).append(",")
               .append(rule.getIsRegex()).append(",")
               .append(rule.getPriority()).append(",")
               .append(rule.getComment() != null ? rule.getComment() : "")
               .append("\n");
        });

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"redirects.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }

    /**
     * POST /api/stores/{storeId}/redirects/refresh
     * Manual cache refresh.
     */
    @PostMapping("/refresh")
    @PreAuthorize("@storeAccessValidator.canManageStore(#storeId, authentication)")
    public ResponseEntity<Void> refreshCache(@PathVariable Long storeId) {
        redirectService.refreshCache();
        return ResponseEntity.ok().build();
    }

    record ImportResult(int imported, List<String> errors) {}
}

