package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import storebackend.service.MediaMigrationService;

/**
 * Admin-Endpoint für die Bereinigung alter Presigned URLs in der Datenbank.
 * 
 * WICHTIG: Nur für PLATFORM_ADMIN oder einmalig nach dem Deployment ausführen!
 */
@RestController
@RequestMapping("/api/admin/media-migration")
@RequiredArgsConstructor
@Slf4j
public class MediaMigrationController {

    private final MediaMigrationService mediaMigrationService;

    /**
     * Bereinigt alle product.image_url-Felder:
     * - Extrahiert objectNames aus vollständigen MinIO-URLs
     * - Entfernt Query-Parameter (Presigned URLs)
     * - Externe URLs bleiben unverändert
     */
    @PostMapping("/clean-product-image-urls")
    @PreAuthorize("hasAuthority('PLATFORM_ADMIN')")
    public ResponseEntity<?> cleanProductImageUrls() {
        log.info("[MediaMigration] Admin initiiert Bereinigung aller product.image_url-Felder");
        
        try {
            int cleaned = mediaMigrationService.cleanAllProductImageUrls();
            
            return ResponseEntity.ok(new MigrationResult(
                "SUCCESS",
                "Bereinigung abgeschlossen",
                cleaned,
                0
            ));
        } catch (Exception e) {
            log.error("[MediaMigration] Fehler bei Bereinigung: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(new MigrationResult(
                "ERROR",
                "Fehler: " + e.getMessage(),
                0,
                0
            ));
        }
    }

    /**
     * Response-DTO für Migration-Ergebnisse
     */
    record MigrationResult(
        String status,
        String message,
        int cleaned,
        int errors
    ) {}
}
