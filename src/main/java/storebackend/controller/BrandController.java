package storebackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.BrandAssetsResponse;
import storebackend.dto.BrandGenerateRequest;
import storebackend.dto.BrandGenerateResponse;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.BrandKitService;
import storebackend.util.StoreAccessChecker;

import java.util.Map;

/**
 * REST-Controller für Brand-Kit-Generierung.
 * Alle Endpunkte unter /api/stores/{storeId}/brand/...
 */
@RestController
@RequestMapping("/api/stores/{storeId}/brand")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
@Slf4j
public class BrandController {

    private final BrandKitService brandKitService;
    private final StoreRepository storeRepository;

    /**
     * POST /api/stores/{storeId}/brand/generate
     * Generiert ein komplettes Brand-Kit (Palette, Logo, Hero, Favicons, OG-Image).
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateBrandKit(
            @PathVariable Long storeId,
            @Valid @RequestBody BrandGenerateRequest request,
            @AuthenticationPrincipal User user) {

        log.info("Brand-Kit-Generierung gestartet für Store {} von User {}", storeId, user != null ? user.getId() : "anonym");

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return ResponseEntity.notFound().build();
        }

        if (!StoreAccessChecker.isOwner(store, user)) {
            log.warn("Zugriff verweigert: User {} ist kein Owner von Store {}", user != null ? user.getId() : "null", storeId);
            return ResponseEntity.status(403).body("Kein Zugriff auf diesen Store");
        }

        // shopName aus Store ableiten, falls im Request leer
        if (request.getShopName() == null || request.getShopName().isBlank()) {
            request.setShopName(store.getName());
        }

        try {
            BrandGenerateResponse response = brandKitService.generateBrandKit(storeId, request);
            log.info("Brand-Kit erfolgreich für Store {}", storeId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Fehler bei Brand-Kit-Generierung für Store {}: {}", storeId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Brand-Kit-Generierung fehlgeschlagen: " + e.getMessage()));
        }
    }

    /**
     * GET /api/stores/{storeId}/brand/assets
     * Gibt gespeicherte Brand-Assets zurück.
     */
    @GetMapping("/assets")
    public ResponseEntity<?> getBrandAssets(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return ResponseEntity.notFound().build();
        }

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Kein Zugriff auf diesen Store");
        }

        try {
            BrandAssetsResponse response = brandKitService.getAssets(storeId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Fehler beim Laden der Brand-Assets für Store {}: {}", storeId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Assets konnten nicht geladen werden"));
        }
    }

    /**
     * PUT /api/stores/{storeId}/brand/palette
     * Speichert eine Farbpalette für den Store.
     */
    @PutMapping("/palette")
    public ResponseEntity<?> savePalette(
            @PathVariable Long storeId,
            @RequestBody Map<String, String> tokens,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return ResponseEntity.notFound().build();
        }

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Kein Zugriff auf diesen Store");
        }

        try {
            Map<String, String> saved = brandKitService.savePalette(storeId, tokens);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Fehler beim Speichern der Palette für Store {}: {}", storeId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Palette konnte nicht gespeichert werden"));
        }
    }
}

