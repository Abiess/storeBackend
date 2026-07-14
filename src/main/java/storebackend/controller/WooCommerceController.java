package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import storebackend.dto.woocommerce.*;
import storebackend.dto.woocommerce.api.WooCategoryDto;
import storebackend.dto.woocommerce.api.WooProductDto;
import storebackend.entity.*;
import storebackend.repository.*;
import storebackend.service.woocommerce.WooCommerceApiClient;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * WooCommerce Import API Controller.
 * 
 * Base Path: /api/stores/{storeId}/woocommerce
 * 
 * Endpoints:
 * - GET /config - Load WooCommerce config
 * - PUT /config - Save WooCommerce config
 * - POST /test - Test WooCommerce connection
 * - POST /preview - Preview products before import
 * 
 * Security:
 * - All endpoints require store owner authentication
 * - Consumer Secret never logged, never returned to frontend
 */
@RestController
@RequestMapping("/api/stores/{storeId}/woocommerce")
@RequiredArgsConstructor
@Slf4j
public class WooCommerceController {

    private final WooCommerceApiClient apiClient;
    private final WooCommerceConfigRepository configRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final storebackend.service.woocommerce.WooCommerceImportService importService;

    // ─────────────────────────────────────────────────────────────────────────
    // GET Config
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/config")
    public ResponseEntity<WooCommerceConfigResponse> getConfig(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        
        verifyOwnership(storeId, user);
        
        Optional<WooCommerceConfig> configOpt = configRepository.findByStoreId(storeId);
        
        if (configOpt.isEmpty()) {
            // No config yet - return empty response
            return ResponseEntity.ok(WooCommerceConfigResponse.builder()
                    .shopUrl("")
                    .consumerKey("")
                    .consumerSecretConfigured(false)
                    .enabled(false)
                    .build());
        }
        
        WooCommerceConfig config = configOpt.get();
        
        WooCommerceConfigResponse response = WooCommerceConfigResponse.builder()
                .shopUrl(config.getShopUrl())
                .consumerKey(config.getConsumerKey())
                .consumerSecretConfigured(config.getConsumerSecret() != null && !config.getConsumerSecret().isEmpty())
                .enabled(config.isEnabled())
                .wcVersion(config.getWcVersion())
                .lastTestSuccessAt(config.getLastTestSuccessAt())
                .build();
        
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT Config
    // ─────────────────────────────────────────────────────────────────────────

    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> saveConfig(
            @PathVariable Long storeId,
            @RequestBody WooCommerceConfigRequest request,
            @AuthenticationPrincipal User user) {
        
        verifyOwnership(storeId, user);
        
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        
        // Load or create config
        WooCommerceConfig config = configRepository.findByStoreId(storeId)
                .orElse(new WooCommerceConfig());
        
        if (config.getId() == null) {
            config.setStore(store);
        }
        
        // Update fields
        config.setShopUrl(request.getShopUrl());
        config.setConsumerKey(request.getConsumerKey());
        config.setEnabled(request.isEnabled());
        
        // Consumer Secret: nur aktualisieren wenn nicht leer
        // SECURITY: Consumer Secret NIEMALS loggen!
        if (request.getConsumerSecret() != null && !request.getConsumerSecret().trim().isEmpty()) {
            config.setConsumerSecret(request.getConsumerSecret());
            log.info("Updated WooCommerce config for store {}: shopUrl={}, consumerSecret updated", 
                storeId, getDomainForLog(request.getShopUrl()));
        } else if (request.isKeepExistingSecret()) {
            // Keep existing secret
            log.info("Updated WooCommerce config for store {}: shopUrl={}, consumerSecret kept", 
                storeId, getDomainForLog(request.getShopUrl()));
        } else {
            // Clear secret
            config.setConsumerSecret(null);
            log.info("Updated WooCommerce config for store {}: shopUrl={}, consumerSecret cleared", 
                storeId, getDomainForLog(request.getShopUrl()));
        }
        
        configRepository.save(config);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "messageKey", "woocommerce.config.saved",
            "consumerSecretConfigured", config.getConsumerSecret() != null && !config.getConsumerSecret().isEmpty()
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST Test Connection
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/test")
    public ResponseEntity<WooCommerceTestResponse> testConnection(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        
        verifyOwnership(storeId, user);
        
        WooCommerceConfig config = configRepository.findByStoreId(storeId)
                .orElseThrow(() -> new RuntimeException("No WooCommerce config found"));
        
        try {
            // Test Connection
            Map<String, Object> result = apiClient.testConnection(config);
            
            // Update config
            config.setLastTestSuccessAt(LocalDateTime.now());
            config.setWcVersion((String) result.get("wcVersion"));
            configRepository.save(config);
            
            // Response
            WooCommerceTestResponse response = WooCommerceTestResponse.builder()
                    .success(true)
                    .messageKey("woocommerce.test.success")
                    .wcVersion((String) result.get("wcVersion"))
                    .wpVersion((String) result.get("wpVersion"))
                    .productCount((Integer) result.get("productCount"))
                    .categoryCount((Integer) result.get("categoryCount"))
                    .build();
            
            log.info("✅ WooCommerce connection test successful for store {}: {} products, {} categories", 
                storeId, result.get("productCount"), result.get("categoryCount"));
            
            return ResponseEntity.ok(response);
            
        } catch (WooCommerceApiClient.WooCommerceApiException e) {
            log.error("❌ WooCommerce connection test failed for store {}: {}", storeId, e.getMessage());
            
            WooCommerceTestResponse response = WooCommerceTestResponse.builder()
                    .success(false)
                    .messageKey(getErrorMessageKey(e))
                    .detail(e.getMessage())
                    .build();
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST Preview
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/preview")
    public ResponseEntity<?> preview(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        
        verifyOwnership(storeId, user);
        
        WooCommerceConfig config = configRepository.findByStoreId(storeId)
                .orElseThrow(() -> new RuntimeException("No WooCommerce config found"));
        
        try {
            // Fetch first page of products
            List<WooProductDto> wooProducts = apiClient.getProducts(config, 1, 20);
            
            // Fetch categories (first 100)
            List<WooCategoryDto> wooCategories = apiClient.getCategories(config, 1, 100);
            
            // Build preview products with duplikat-check
            List<WooCommerceProductPreview> products = wooProducts.stream()
                    .map(wooProduct -> buildProductPreview(storeId, wooProduct))
                    .collect(Collectors.toList());
            
            // Count products with variant warning (>3 attributes)
            long productsWithVariantWarning = products.stream()
                    .filter(WooCommerceProductPreview::isHasVariantLimitWarning)
                    .count();
            
            // Count products already imported
            long alreadyImportedCount = products.stream()
                    .filter(WooCommerceProductPreview::isAlreadyImported)
                    .count();
            
            // Build response
            WooCommercePreviewResponse response = WooCommercePreviewResponse.builder()
                    .totalProducts(wooProducts.size()) // MVP: nur erste Seite, kein X-WP-Total Header
                    .products(products)
                    .categoriesCount(wooCategories.size())
                    .alreadyImportedCount((int) alreadyImportedCount)
                    .productsWithVariantWarning((int) productsWithVariantWarning)
                    .build();
            
            log.info("✅ WooCommerce preview loaded for store {}: {} products, {} categories, {} already imported", 
                storeId, products.size(), wooCategories.size(), alreadyImportedCount);
            
            return ResponseEntity.ok(response);
            
        } catch (WooCommerceApiClient.WooCommerceApiException e) {
            log.error("❌ WooCommerce preview failed for store {}: {}", storeId, e.getMessage());
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "messageKey", getErrorMessageKey(e),
                "detail", e.getMessage()
            ));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST Import
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/import")
    public ResponseEntity<WooCommerceImportResponse> startImport(
            @PathVariable Long storeId,
            @RequestBody(required = false) WooCommerceImportRequest request,
            @AuthenticationPrincipal User user) {
        
        verifyOwnership(storeId, user);
        
        // Default request if not provided
        if (request == null) {
            request = WooCommerceImportRequest.builder()
                    .importImages(true)
                    .skipExisting(true)
                    .build();
        }
        
        try {
            WooCommerceImportResponse response = importService.startImport(storeId, request, user);
            
            log.info("✅ WooCommerce import completed for store {}: {} imported, {} skipped, {} failed", 
                storeId, 
                response.getImportedCount(),
                response.getSkippedCount(),
                response.getFailedCount()
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ WooCommerce import failed for store {}: {}", storeId, e.getMessage());
            
            WooCommerceImportResponse errorResponse = WooCommerceImportResponse.builder()
                    .status("FAILED")
                    .importedCount(0)
                    .skippedCount(0)
                    .failedCount(0)
                    .messageKey("woocommerce.import.failed")
                    .build();
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Baut WooCommerceProductPreview mit Duplikat-Check.
     */
    private WooCommerceProductPreview buildProductPreview(Long storeId, WooProductDto wooProduct) {
        // Duplikat-Check: externalSource=WOOCOMMERCE + externalId
        boolean alreadyImported = productRepository
                .findByStoreIdAndExternalSourceAndExternalId(storeId, "WOOCOMMERCE", wooProduct.getId().toString())
                .isPresent();
        
        // Duplikat-Check: SKU (falls vorhanden)
        if (!alreadyImported && wooProduct.getSku() != null && !wooProduct.getSku().isEmpty()) {
            alreadyImported = productRepository
                    .findByStoreIdAndSku(storeId, wooProduct.getSku())
                    .isPresent();
        }
        
        // Varianten-Limit Warnung (>3 Attribute)
        boolean hasVariantLimitWarning = false;
        int variantCount = 0;
        
        if ("variable".equals(wooProduct.getType()) && wooProduct.getVariations() != null) {
            variantCount = wooProduct.getVariations().size();
            
            if (wooProduct.getAttributes() != null) {
                long variationAttributes = wooProduct.getAttributes().stream()
                        .filter(attr -> attr.getVariation() != null && attr.getVariation())
                        .count();
                hasVariantLimitWarning = variationAttributes > 3;
            }
        }
        
        // Image URL
        String imageUrl = null;
        if (wooProduct.getImages() != null && !wooProduct.getImages().isEmpty()) {
            imageUrl = wooProduct.getImages().get(0).getSrc();
        }
        
        // Category Names
        List<String> categoryNames = new ArrayList<>();
        if (wooProduct.getCategories() != null) {
            categoryNames = wooProduct.getCategories().stream()
                    .map(cat -> cat.getName())
                    .collect(Collectors.toList());
        }
        
        // Skip Reason
        String skipReason = null;
        if (alreadyImported) {
            skipReason = "Already imported";
        } else if (!"publish".equals(wooProduct.getStatus())) {
            skipReason = "Status: " + wooProduct.getStatus();
        }
        
        return WooCommerceProductPreview.builder()
                .wooCommerceId(wooProduct.getId())
                .name(wooProduct.getName())
                .sku(wooProduct.getSku())
                .price(wooProduct.getPrice())
                .status(wooProduct.getStatus())
                .imageUrl(imageUrl)
                .categoryNames(categoryNames)
                .variationCount(variantCount)
                .alreadyImported(alreadyImported)
                .hasVariantLimitWarning(hasVariantLimitWarning)
                .skipReason(skipReason)
                .build();
    }

    /**
     * Store Owner Check.
     */
    private void verifyOwnership(Long storeId, User user) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
        
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You are not the owner of this store");
        }
    }

    /**
     * Extrahiert Domain für Logging (ohne Credentials).
     */
    private String getDomainForLog(String shopUrl) {
        if (shopUrl == null || shopUrl.isEmpty()) {
            return "";
        }
        try {
            java.net.URI uri = new java.net.URI(shopUrl);
            return uri.getHost();
        } catch (Exception e) {
            return shopUrl;
        }
    }

    /**
     * Maps WooCommerceApiException zu i18n messageKey.
     */
    private String getErrorMessageKey(WooCommerceApiClient.WooCommerceApiException e) {
        String message = e.getMessage().toLowerCase();
        
        if (message.contains("401") || message.contains("403") || message.contains("credentials")) {
            return "woocommerce.error.invalidCredentials";
        }
        if (message.contains("404") || message.contains("not found")) {
            return "woocommerce.error.apiNotFound";
        }
        if (message.contains("429") || message.contains("rate limit")) {
            return "woocommerce.error.rateLimitExceeded";
        }
        if (message.contains("timeout")) {
            return "woocommerce.error.connectionTimeout";
        }
        if (message.contains("5xx") || message.contains("server")) {
            return "woocommerce.error.shopError";
        }
        
        return "woocommerce.error.unknown";
    }
}
