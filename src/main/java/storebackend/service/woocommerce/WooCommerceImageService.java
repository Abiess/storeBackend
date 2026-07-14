package storebackend.service.woocommerce;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.entity.Media;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.WooCommerceImportLog;
import storebackend.repository.WooCommerceImportLogRepository;
import storebackend.service.MediaService;
import storebackend.service.MinioService;

import java.io.IOException;

/**
 * WooCommerce Image Import Service.
 * 
 * Download images from WooCommerce and upload to MinIO.
 * 
 * Features:
 * - Download image from WooCommerce URL
 * - Upload to MinIO via MediaService.uploadFromUrl()
 * - Set Product.imageUrl
 * - Fallback: If upload fails, import product without image + warning log
 * 
 * Security:
 * - No credentials in logs
 * - Only log image URL domain
 * - Catch all exceptions → product import continues
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WooCommerceImageService {

    private final MediaService mediaService;
    private final MinioService minioService;
    private final WooCommerceImportLogRepository importLogRepository;

    /**
     * Import product image from WooCommerce.
     * 
     * @param product Product entity (not yet saved)
     * @param imageUrl WooCommerce image URL
     * @param store Store
     * @param importJobId Import Job ID for logging
     * @return true if successful, false if failed
     */
    public boolean importProductImage(
            Product product,
            String imageUrl,
            Store store,
            Long importJobId
    ) {
        if (imageUrl == null || imageUrl.isBlank()) {
            log.debug("No image URL for product: {}", product.getTitle());
            return false;
        }

        try {
            log.info("📥 Importing image for product '{}': {}", 
                product.getTitle(), getDomainForLog(imageUrl));

            // Upload via MediaService (uses MinIO)
            Media media = mediaService.uploadFromUrl(
                store,
                imageUrl,
                product.getTitle() + " (WooCommerce Import)"
            );

            if (media != null) {
                // Get permanent public URL
                String publicUrl = minioService.getPublicUrl(media.getMinioObjectName());
                product.setImageUrl(publicUrl);
                
                log.info("✅ Image imported: mediaId={} for product '{}'", 
                    media.getId(), product.getTitle());
                
                return true;
            } else {
                logImageWarning(importJobId, store, product.getTitle(), imageUrl, "Media upload returned null");
                return false;
            }

        } catch (IOException e) {
            log.warn("⚠️ Image download failed for product '{}': {}", 
                product.getTitle(), e.getMessage());
            logImageWarning(importJobId, store, product.getTitle(), imageUrl, e.getMessage());
            return false;
            
        } catch (Exception e) {
            log.error("❌ Unexpected error importing image for product '{}': {}", 
                product.getTitle(), e.getMessage());
            logImageWarning(importJobId, store, product.getTitle(), imageUrl, e.getMessage());
            return false;
        }
    }

    /**
     * Log image import warning.
     */
    private void logImageWarning(Long importJobId, Store store, String productTitle, String imageUrl, String errorMessage) {
        if (importJobId == null || store == null) {
            return;
        }

        WooCommerceImportLog logEntry = new WooCommerceImportLog();
        logEntry.setStore(store);  // ✅ FIX Bug #2
        logEntry.setStatus("WARNING");
        logEntry.setErrorMessage(String.format(
            "Image import failed for product '%s'. Product imported without image. Error: %s",
            productTitle,
            errorMessage
        ));
        logEntry.setProductName(productTitle);
        logEntry.setWoocommerceProductId(null); // null für Bild-Logs ohne WC Product ID
        
        importLogRepository.save(logEntry);
    }

    /**
     * Extract domain from URL for safe logging.
     */
    private String getDomainForLog(String url) {
        if (url == null || url.isEmpty()) {
            return "";
        }
        try {
            java.net.URI uri = new java.net.URI(url);
            return uri.getHost();
        } catch (Exception e) {
            return url.length() > 50 ? url.substring(0, 50) + "..." : url;
        }
    }
}
