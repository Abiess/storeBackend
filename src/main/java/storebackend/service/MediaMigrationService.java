package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Product;
import storebackend.repository.ProductRepository;

import java.util.List;

/**
 * Service für die Bereinigung alter Presigned URLs in der Datenbank.
 * 
 * Problem:
 * - Alte Implementierungen haben vollständige MinIO-URLs mit Query-Parametern in product.image_url gespeichert
 * - Diese Presigned URLs laufen nach 7 Tagen ab → 403 Access Denied Fehler
 * 
 * Lösung:
 * - Extrahiert objectName aus vollständigen URLs
 * - Entfernt Query-Parameter
 * - Externe URLs bleiben unverändert
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MediaMigrationService {

    private final ProductRepository productRepository;
    private final MinioService minioService;

    /**
     * Bereinigt alle product.image_url-Felder:
     * - Extrahiert objectName aus MinIO-URLs
     * - Entfernt Query-Parameter (Presigned URLs)
     * - Externe URLs bleiben unverändert
     * 
     * @return Anzahl der bereinigten Einträge
     */
    @Transactional
    public int cleanAllProductImageUrls() {
        log.info("[MediaMigration] Starte Bereinigung aller product.image_url-Felder");
        
        List<Product> allProducts = productRepository.findAll();
        int cleanedCount = 0;
        
        for (Product product : allProducts) {
            if (product.getImageUrl() == null || product.getImageUrl().isBlank()) {
                continue; // Nichts zu bereinigen
            }
            
            String currentUrl = product.getImageUrl();
            String cleanedUrl = cleanImageUrl(currentUrl);
            
            if (!currentUrl.equals(cleanedUrl)) {
                log.info("[MediaMigration] Product {}: '{}' → '{}'", 
                    product.getId(), 
                    currentUrl.substring(0, Math.min(80, currentUrl.length())),
                    cleanedUrl);
                
                product.setImageUrl(cleanedUrl);
                productRepository.save(product);
                cleanedCount++;
            }
        }
        
        log.info("[MediaMigration] Bereinigung abgeschlossen: {} von {} Produkten aktualisiert", 
            cleanedCount, allProducts.size());
        
        return cleanedCount;
    }

    /**
     * Bereinigt eine einzelne URL:
     * - MinIO-URL mit Query-Parameter → objectName
     * - MinIO-URL ohne Query-Parameter → objectName
     * - Bereits objectName → unverändert
     * - Externe URL → unverändert
     */
    private String cleanImageUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        
        // Externe URL? Unverändert zurückgeben
        if (isExternalUrl(url)) {
            return url;
        }
        
        // MinIO-URL? Extrahiere objectName
        String objectName = minioService.extractObjectNameFromUrl(url);
        if (objectName != null) {
            return objectName;
        }
        
        // Bereits ein objectName oder nicht erkannte URL
        return url;
    }

    /**
     * Prüft ob eine URL extern ist (nicht MinIO)
     */
    private boolean isExternalUrl(String url) {
        if (url == null || !url.startsWith("http")) {
            return false; // Kein http/https = lokaler Path/objectName
        }
        
        // Prüfe ob es eine MinIO-URL ist
        String objectName = minioService.extractObjectNameFromUrl(url);
        return objectName == null; // Kein objectName gefunden = externe URL
    }
}
