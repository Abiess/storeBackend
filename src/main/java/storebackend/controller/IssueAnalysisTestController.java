package storebackend.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.IssueImageAnalysisDTO;
import storebackend.exception.AiServiceException;
import storebackend.service.AiImageCaptioningService;
import storebackend.service.OpenRouterService;

import java.util.Map;

/**
 * TEMPORÄRER, ISOLIERTER TEST-CONTROLLER.
 *
 * Zweck: Machbarkeitstest für "Bild hochladen → OpenRouter Vision → Reparaturproblem als JSON".
 * Keine Businesslogik, keine Handwerker-Suche, keine Persistenz, keine DB-Änderungen.
 * Wiederverwendet ausschließlich bestehende Infrastruktur:
 *  - Bildkomprimierung: {@link AiImageCaptioningService#compressAndResizeImage(byte[])}
 *  - OpenRouter-Vision-Client + Fehlerbehandlung: {@link OpenRouterService}
 *
 * Nach dem Test wieder entfernen (inkl. SecurityConfig-Eintrag für "/api/test/**").
 */
@RestController
@RequestMapping("/api/test")
@Slf4j
public class IssueAnalysisTestController {

    private final OpenRouterService openRouterService;

    public IssueAnalysisTestController(OpenRouterService openRouterService) {
        this.openRouterService = openRouterService;
    }

    @PostMapping(value = "/issue-analysis", consumes = "multipart/form-data")
    public ResponseEntity<?> analyzeIssueImage(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "language", required = false, defaultValue = "de") String language) {

        log.info("=== TEST: ISSUE IMAGE ANALYSIS ===");
        log.info("Image: {}, size: {} bytes, language: {}",
                image.getOriginalFilename(), image.getSize(), language);

        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image file is required"));
        }
        if (!openRouterService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "OpenRouter API key not configured. Set OPENROUTER_API_KEY env var."));
        }

        try {
            byte[] optimizedImageBytes = AiImageCaptioningService.compressAndResizeImage(image.getBytes());
            IssueImageAnalysisDTO result = openRouterService.analyzeIssueImage(optimizedImageBytes, language);
            log.info("✅ Issue-analysis result: category={}, urgency={}, confidence={}",
                    result.getCategory(), result.getUrgency(), result.getConfidence());
            return ResponseEntity.ok(result);
        } catch (AiServiceException e) {
            log.error("❌ OpenRouter issue-analysis failed: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error during issue-analysis: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to analyze image: " + e.getMessage()));
        }
    }
}
