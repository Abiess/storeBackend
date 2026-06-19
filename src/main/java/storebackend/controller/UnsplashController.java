package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.UnsplashApplyRequest;
import storebackend.dto.UnsplashImageDTO;
import storebackend.entity.Media;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.BusinessType;
import storebackend.repository.StoreRepository;
import storebackend.service.MediaService;
import storebackend.service.StoreSliderService;
import storebackend.service.UnsplashImageService;
import storebackend.util.StoreAccessChecker;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST-Controller für Unsplash-Bildvorschläge im Create-Store-Wizard.
 *
 * Alle Endpoints erfordern Authentifizierung (via anyRequest().authenticated() in SecurityConfig).
 * Der Unsplash Access-Key bleibt AUSSCHLIESSLICH serverseitig.
 */
@RestController
@RequestMapping("/api/assets/suggestions")
@RequiredArgsConstructor
@Slf4j
public class UnsplashController {

    private final UnsplashImageService unsplashImageService;
    private final MediaService mediaService;
    private final StoreSliderService storeSliderService;
    private final StoreRepository storeRepository;

    /**
     * Sucht passende freie Bilder auf Unsplash je nach businessType.
     *
     * @param businessType RIAD | RESTAURANT | SHOP
     * @param query        optionaler Suchbegriff (überschreibt den BusinessType-Default)
     * @param page         Seite (1-basiert), Default: 1
     */
    @GetMapping
    public ResponseEntity<?> getSuggestions(
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "1") int page,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        if (!unsplashImageService.isConfigured()) {
            log.info("[Unsplash] Kein API-Key konfiguriert – leere Vorschläge zurückgegeben");
            return ResponseEntity.ok(Map.of(
                "images", List.of(),
                "configured", false,
                "message", "Unsplash API key not configured"
            ));
        }

        BusinessType bt = parseBusinessType(businessType);
        List<UnsplashImageDTO> images = unsplashImageService.searchPhotos(bt, query, page);

        return ResponseEntity.ok(Map.of(
            "images", images,
            "configured", true,
            "page", page
        ));
    }

    /**
     * Wendet die vom User ausgewählten Unsplash-Bilder an:
     * 1. Unsplash Download-Tracking (API-Pflicht)
     * 2. Bild herunterladen + in MinIO speichern (via MediaService.uploadFromUrl)
     * 3. Bild zum Store-Slider hinzufügen (via StoreSliderService.addMediaToSlider)
     */
    @PostMapping("/apply")
    public ResponseEntity<?> applyImages(
            @RequestBody UnsplashApplyRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        if (request.getImages() == null || request.getImages().isEmpty()) {
            return ResponseEntity.badRequest().body("Keine Bilder ausgewählt");
        }

        Store store = storeRepository.findById(request.getStoreId())
            .orElseThrow(() -> new RuntimeException("Store nicht gefunden"));

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Nicht autorisiert");
        }

        int saved = 0;
        int failed = 0;
        Map<String, Object> result = new HashMap<>();

        for (UnsplashApplyRequest.SelectedImage img : request.getImages()) {
            try {
                // 1. Unsplash Download-Tracking (Pflicht per API-Terms!)
                unsplashImageService.triggerDownload(img.getDownloadLocation());

                // 2. Bild von Unsplash herunterladen + in MinIO speichern
                Media media = mediaService.uploadFromUrl(store, img.getRegularUrl(),
                    img.getDescription() != null ? img.getDescription() : "Unsplash image");

                // 3. Zum Slider hinzufügen
                if ("SLIDER".equalsIgnoreCase(request.getTarget())) {
                    storeSliderService.addMediaToSlider(store, media, img.getDescription());
                }

                saved++;
                log.info("[Unsplash] Bild gespeichert in Store {}: mediaId={}", store.getId(), media.getId());
            } catch (Exception e) {
                failed++;
                log.error("[Unsplash] Fehler beim Speichern eines Bildes für Store {}: {}",
                    store.getId(), e.getMessage());
            }
        }

        result.put("saved", saved);
        result.put("failed", failed);
        result.put("total", request.getImages().size());
        result.put("storeId", store.getId());

        if (failed > 0) {
            log.warn("[Unsplash] Apply für Store {}: {}/{} Bilder gespeichert, {} fehlgeschlagen",
                store.getId(), saved, request.getImages().size(), failed);
        }

        return ResponseEntity.ok(result);
    }

    private BusinessType parseBusinessType(String value) {
        if (value == null || value.isBlank()) return BusinessType.SHOP;
        try {
            return BusinessType.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return BusinessType.SHOP;
        }
    }
}
