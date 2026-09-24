package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CleanWooCommerceDescriptionsRequest;
import storebackend.dto.CleanWooCommerceDescriptionsResponse;
import storebackend.entity.User;
import storebackend.service.WooCommerceCleanupService;

/**
 * Admin-Controller für WooCommerce-Bereinigungsfunktionen.
 * 
 * Erlaubt Store-Ownern, ihre bestehenden WooCommerce-Produkte zu bereinigen.
 * 
 * Sicherheit:
 * - Nur authentifizierte Benutzer
 * - Nur eigene Stores (automatische Berechtigungsprüfung)
 * - Dry-Run standardmäßig aktiviert
 */
@RestController
@RequestMapping("/api/admin/products/woocommerce")
@Tag(name = "WooCommerce Admin", description = "Admin operations for WooCommerce products")
@RequiredArgsConstructor
@Slf4j
public class WooCommerceAdminController {

    private final WooCommerceCleanupService cleanupService;

    /**
     * Bereinigt WooCommerce-Produktbeschreibungen (HTML → Klartext).
     * 
     * Sicherheit:
     * - Nur authentifizierte Benutzer (401 bei fehlender Auth)
     * - Nur eigene Stores (403 bei fremdem Store)
     * - Dry-Run standardmäßig aktiviert (Schutz vor versehentlicher Ausführung)
     * 
     * Transaktionsverhalten:
     * - Teilweise Verarbeitung: Erfolgreiche Produkte werden gespeichert
     * - Fehlerhafte Produkte werden übersprungen und in errors[] gemeldet
     * - Kein vollständiges Rollback bei einzelnen Produkt-Fehlern
     * 
     * @param request Request mit storeId (optional) und dryRun (default: true)
     * @param user Authentifizierter User
     * @return Statistik und Vorschau der Bereinigung
     */
    @PostMapping("/clean-descriptions")
    @Operation(
        summary = "Bereinigt WooCommerce-Produktbeschreibungen",
        description = "Konvertiert HTML-Beschreibungen zu sauberem Klartext. " +
                      "**WICHTIG:** Standardmäßig Dry-Run (dryRun=true, nichts wird gespeichert). " +
                      "Setze dryRun=false zum tatsächlichen Bereinigen. " +
                      "Erfolgreiche Produkte werden gespeichert, fehlerhafte übersprungen."
    )
    public ResponseEntity<CleanWooCommerceDescriptionsResponse> cleanDescriptions(
            @RequestBody(required = false) CleanWooCommerceDescriptionsRequest request,
            @AuthenticationPrincipal User user
    ) {
        // 1. Sicherheit: User muss authentifiziert sein
        if (user == null) {
            log.warn("⚠️ Unauthenticated request to clean-descriptions");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(CleanWooCommerceDescriptionsResponse.builder()
                            .checked(0)
                            .affected(0)
                            .updated(0)
                            .dryRun(true)
                            .errors(java.util.List.of("Authentication required"))
                            .build());
        }

        // 2. Default-Request bei fehlendem Body (IMMER dryRun=true)
        if (request == null) {
            request = CleanWooCommerceDescriptionsRequest.builder()
                    .dryRun(true)
                    .build();
            log.info("ℹ️ No request body provided, using default: dryRun=true");
        }

        // 3. Sicherheit: dryRun MUSS explizit auf false gesetzt werden
        // Fehlende oder null Werte werden zu true
        if (request.getDryRun() == null) {
            request.setDryRun(true);
            log.info("ℹ️ dryRun not specified, defaulting to true (safe mode)");
        }

        log.info("🔧 WooCommerce cleanup requested by user {} (storeId={}, dryRun={})",
                user.getId(), request.getStoreId(), request.getDryRun());

        try {
            CleanWooCommerceDescriptionsResponse response = cleanupService.cleanDescriptions(request, user);
            
            // 403 bei fehlenden Berechtigungen (keine zugänglichen Stores)
            if (response.getChecked() == 0 && 
                response.getErrors().contains("No accessible stores found")) {
                log.warn("❌ User {} has no access to requested store(s)", user.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(response);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Failed to clean WooCommerce descriptions: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(CleanWooCommerceDescriptionsResponse.builder()
                            .checked(0)
                            .affected(0)
                            .updated(0)
                            .dryRun(request.getDryRun())
                            .errors(java.util.List.of("Internal error: " + e.getMessage()))
                            .build());
        }
    }
}
