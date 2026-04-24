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
import storebackend.repository.ThemeTemplateRepository;
import storebackend.service.DemoContentService;
import storebackend.service.ThemeService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

/**
 * Controller für Theme-Verwaltung
 * Öffentlicher Zugriff auf aktive Themes, authentifizierter Zugriff für Verwaltung
 */
@RestController
@RequestMapping("/api/themes")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
@Slf4j
public class ThemeController {

    private final ThemeService themeService;
    private final StoreRepository storeRepository;
    private final ThemeTemplateRepository themeTemplateRepository;
    private final DemoContentService demoContentService;

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

    // =====================================================================
    // Free / Premium Theme-Templates (Vorlagen-Katalog)
    // =====================================================================

    /**
     * Öffentlicher Endpunkt: Alle aktiven Theme-Templates abrufen.
     * Optional Filter ?onlyFree=true → nur kostenlose Vorlagen.
     */
    @GetMapping("/templates")
    public ResponseEntity<?> listTemplates(
            @RequestParam(name = "onlyFree", defaultValue = "false") boolean onlyFree) {
        log.info("Listing theme templates (onlyFree={})", onlyFree);
        return ResponseEntity.ok(themeService.listTemplates(onlyFree));
    }

    /**
     * 1-Klick-Anwendung: Übernimmt eine Template-Vorlage als aktives Theme
     * eines Stores. Speichert sofort in der DB.
     *
     * POST /api/themes/store/{storeId}/apply-template/{templateId}?name=Optional
     */
    @PostMapping("/store/{storeId}/apply-template/{templateId}")
    public ResponseEntity<?> applyTemplate(
            @PathVariable Long storeId,
            @PathVariable Long templateId,
            @RequestParam(name = "name", required = false) String customName,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        log.info("Applying template {} to store {} (user: {})",
                templateId, storeId, user.getEmail());
        return ResponseEntity.ok(themeService.applyTemplateToStore(storeId, templateId, customName));
    }

    /**
     * Onboarding-Endpoint: Wendet ein Template per <b>Code</b> an und befüllt
     * den Store optional mit branchenpassenden Demo-Kategorien und -Produkten.
     * <p>
     * Wird vom Frontend direkt nach der Store-Erstellung im Onboarding-Schritt
     * aufgerufen. Idempotent: Demo-Daten werden nur eingefügt, wenn der Store
     * noch leer ist.
     * <p>
     * POST /api/themes/store/{storeId}/onboard?templateCode=ELECTRONICS_PRO&amp;withDemoData=true
     */
    @PostMapping("/store/{storeId}/onboard")
    public ResponseEntity<?> onboardStoreWithTemplate(
            @PathVariable Long storeId,
            @RequestParam(name = "templateCode") String templateCode,
            @RequestParam(name = "withDemoData", defaultValue = "true") boolean withDemoData,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        var template = themeTemplateRepository.findByCode(templateCode.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Template not found: " + templateCode));

        log.info("🎁 Onboarding store {} with template '{}' (demoData={})",
                storeId, templateCode, withDemoData);

        // 1) Theme anwenden – nutzt bestehende Service-Methode
        StoreThemeDTO theme = themeService.applyTemplateToStore(
                storeId, template.getId(), template.getName() + " Theme");

        // 2) Optional: Demo-Daten seeden (idempotent)
        int productsCreated = 0;
        if (withDemoData) {
            productsCreated = demoContentService.seedDemoContent(store, template.getCode());
        }

        return ResponseEntity.ok(java.util.Map.of(
                "theme", theme,
                "demoProductsCreated", productsCreated,
                "templateCode", template.getCode(),
                "templateName", template.getName()
        ));
    }
}
