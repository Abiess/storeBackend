package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateThemeRequest;
import storebackend.dto.StoreThemeDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.ThemeService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

/**
 * Controller für Theme-Verwaltung
 * Öffentlicher Zugriff auf aktive Themes, authentifizierter Zugriff für Verwaltung
 */
@RestController
@RequestMapping("/api/themes")
@RequiredArgsConstructor
@Slf4j
public class ThemeController {

    private final ThemeService themeService;
    private final StoreRepository storeRepository;

    /**
     * Öffentlicher Endpunkt: Hole aktives Theme eines Stores
     */
    @GetMapping("/store/{storeId}/active")
    public ResponseEntity<StoreThemeDTO> getActiveTheme(@PathVariable Long storeId) {
        log.info("Public request for active theme of store: {}", storeId);
        StoreThemeDTO theme = themeService.getActiveTheme(storeId);
        return ResponseEntity.ok(theme);
    }

    /**
     * Hole alle Themes eines Stores (für Store-Owner)
     */
    @GetMapping("/store/{storeId}")
    public ResponseEntity<?> getStoreThemes(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        log.info("Request for all themes of store: {}", storeId);
        return ResponseEntity.ok(themeService.getStoreThemes(storeId));
    }

    /**
     * Erstelle ein neues Theme
     */
    @PostMapping
    public ResponseEntity<?> createTheme(
            @RequestBody CreateThemeRequest request,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        log.info("Creating new theme for store: {}", request.getStoreId());
        return ResponseEntity.ok(themeService.createTheme(request));
    }

    /**
     * Aktualisiere ein Theme
     */
    @PutMapping("/{themeId}")
    public ResponseEntity<?> updateTheme(
            @PathVariable Long themeId,
            @RequestBody StoreThemeDTO updates,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        // Ownership wird im ThemeService geprüft (Theme gehört zu einem Store)
        log.info("Updating theme: {}", themeId);
        return ResponseEntity.ok(themeService.updateTheme(themeId, updates));
    }

    /**
     * Aktiviere ein Theme
     */
    @PostMapping("/{themeId}/activate")
    public ResponseEntity<?> activateTheme(
            @PathVariable Long themeId,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        log.info("Activating theme: {}", themeId);
        themeService.activateTheme(themeId);
        return ResponseEntity.ok().build();
    }

    /**
     * Lösche ein Theme
     */
    @DeleteMapping("/{themeId}")
    public ResponseEntity<?> deleteTheme(
            @PathVariable Long themeId,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        log.info("Deleting theme: {}", themeId);
        themeService.deleteTheme(themeId);
        return ResponseEntity.noContent().build();
    }
}
