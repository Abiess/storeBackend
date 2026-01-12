package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateThemeRequest;
import storebackend.dto.StoreThemeDTO;
import storebackend.service.ThemeService;

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
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<List<StoreThemeDTO>> getStoreThemes(@PathVariable Long storeId) {
        log.info("Request for all themes of store: {}", storeId);
        List<StoreThemeDTO> themes = themeService.getStoreThemes(storeId);
        return ResponseEntity.ok(themes);
    }

    /**
     * Erstelle ein neues Theme
     */
    @PostMapping
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<StoreThemeDTO> createTheme(@RequestBody CreateThemeRequest request) {
        log.info("Creating new theme for store: {}", request.getStoreId());
        StoreThemeDTO theme = themeService.createTheme(request);
        return ResponseEntity.ok(theme);
    }

    /**
     * Aktualisiere ein Theme
     */
    @PutMapping("/{themeId}")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<StoreThemeDTO> updateTheme(
            @PathVariable Long themeId,
            @RequestBody StoreThemeDTO updates) {
        log.info("Updating theme: {}", themeId);
        StoreThemeDTO theme = themeService.updateTheme(themeId, updates);
        return ResponseEntity.ok(theme);
    }

    /**
     * Aktiviere ein Theme
     */
    @PostMapping("/{themeId}/activate")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<Void> activateTheme(@PathVariable Long themeId) {
        log.info("Activating theme: {}", themeId);
        themeService.activateTheme(themeId);
        return ResponseEntity.ok().build();
    }

    /**
     * Lösche ein Theme
     */
    @DeleteMapping("/{themeId}")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<Void> deleteTheme(@PathVariable Long themeId) {
        log.info("Deleting theme: {}", themeId);
        themeService.deleteTheme(themeId);
        return ResponseEntity.noContent().build();
    }
}
