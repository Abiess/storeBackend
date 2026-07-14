package storebackend.service.woocommerce;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.woocommerce.*;
import storebackend.dto.woocommerce.api.WooCategoryDto;
import storebackend.dto.woocommerce.api.WooProductDto;
import storebackend.entity.*;
import storebackend.enums.ProductStatus;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WooCommerce Import Service.
 * 
 * MVP Scope:
 * - Import categories (flat, no hierarchy)
 * - Import simple products (type=simple)
 * - Skip variable products (type=variable) with warning
 * - Import images via WooCommerceImageService
 * - Skip duplicates (externalSource + externalId + SKU)
 * - Write import logs
 * - Create import job
 * 
 * NOT in MVP:
 * - Product variants
 * - Category hierarchy
 * - Update existing products
 * - Progress polling
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WooCommerceImportService {

    private final WooCommerceApiClient apiClient;
    private final WooCommerceImageService imageService;
    private final WooCommerceConfigRepository configRepository;
    private final WooCommerceImportJobRepository importJobRepository;
    private final WooCommerceImportLogRepository importLogRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;

    private static final String EXTERNAL_SOURCE = "WOOCOMMERCE";
    private static final int MAX_IMPORT_SIZE = 50; // MVP: max 50 products per import

    /**
     * Start import process.
     * 
     * @param storeId Store ID
     * @param request Import request (productIds, options)
     * @param user Authenticated user
     * @return Import result
     */
    @Transactional
    public WooCommerceImportResponse startImport(Long storeId, WooCommerceImportRequest request, User user) {
        log.info("🚀 Starting WooCommerce import for store {}", storeId);

        // Load store
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // Load config
        WooCommerceConfig config = configRepository.findByStoreId(storeId)
                .orElseThrow(() -> new RuntimeException("WooCommerce config not found for store " + storeId));

        // Create import job
        WooCommerceImportJob job = new WooCommerceImportJob();
        job.setStore(store);
        job.setTriggeredBy(user);  // ✅ FIX Bug #3
        job.setStatus("IN_PROGRESS");
        job.setStartedAt(LocalDateTime.now());
        job = importJobRepository.save(job);
        
        final Long jobId = job.getId();

        try {
            // Import categories first
            Map<Long, Category> categoryMap = importCategories(config, store, jobId);
            logInfo(jobId, String.format("Imported %d categories", categoryMap.size()));

            // Fetch products from WooCommerce
            List<WooProductDto> wooProducts = fetchProductsToImport(config, request);
            
            // Limit to MAX_IMPORT_SIZE
            if (wooProducts.size() > MAX_IMPORT_SIZE) {
                logWarning(jobId, String.format(
                    "Import limited to %d products (requested: %d). Please import in batches.",
                    MAX_IMPORT_SIZE, wooProducts.size()
                ));
                wooProducts = wooProducts.subList(0, MAX_IMPORT_SIZE);
            }

            // Import products
            ImportResult result = importProducts(
                wooProducts,
                store,
                categoryMap,
                jobId,
                request.isImportImages()
            );

            // Update job
            job.setStatus("COMPLETED");
            job.setCompletedAt(LocalDateTime.now());
            job.setTotalProducts(wooProducts.size());
            job.setImportedProducts(result.imported);
            job.setSkippedProducts(result.skipped);
            job.setFailedProducts(result.failed);
            importJobRepository.save(job);

            logSuccess(jobId, String.format(
                "Import completed: %d imported, %d skipped, %d failed",
                result.imported, result.skipped, result.failed
            ));

            // Build response
            return WooCommerceImportResponse.builder()
                    .jobId(jobId)
                    .status("COMPLETED")
                    .importedCount(result.imported)
                    .skippedCount(result.skipped)
                    .failedCount(result.failed)
                    .warnings(result.warnings)
                    .messageKey("woocommerce.import.success")
                    .build();

        } catch (Exception e) {
            // Update job
            job.setStatus("FAILED");
            job.setCompletedAt(LocalDateTime.now());
            job.setErrorMessage(e.getMessage());
            importJobRepository.save(job);

            logError(jobId, "Import failed: " + e.getMessage());
            
            throw new RuntimeException("WooCommerce import failed: " + e.getMessage(), e);
        }
    }

    /**
     * Import categories from WooCommerce.
     * 
     * @return Map: WooCommerce Category ID → markt.ma Category
     */
    private Map<Long, Category> importCategories(
            WooCommerceConfig config,
            Store store,
            Long jobId
    ) {
        log.info("📂 Importing categories...");
        Map<Long, Category> categoryMap = new HashMap<>();

        try {
            // Fetch all categories (up to 100)
            List<WooCategoryDto> wooCategories = apiClient.getCategories(config, 1, 100);
            
            for (WooCategoryDto wooCategory : wooCategories) {
                // Check duplicate
                var existing = categoryRepository.findByStoreIdAndExternalSourceAndExternalId(
                    store.getId(),
                    EXTERNAL_SOURCE,
                    wooCategory.getId().toString()
                );

                if (existing.isPresent()) {
                    categoryMap.put(wooCategory.getId(), existing.get());
                    log.debug("Category already exists: {}", wooCategory.getName());
                    continue;
                }

                // Create category
                Category category = new Category();
                category.setStore(store);
                category.setName(wooCategory.getName());
                category.setSlug(generateSlug(wooCategory.getName(), store.getId()));
                category.setDescription(wooCategory.getDescription());
                category.setSortOrder(0); // MVP: No order from WooCommerce
                category.setExternalSource(EXTERNAL_SOURCE);
                category.setExternalId(wooCategory.getId().toString());
                category.setLastImportedAt(LocalDateTime.now());

                // MVP: Flat categories, no parent
                category.setParent(null);

                category = categoryRepository.save(category);
                categoryMap.put(wooCategory.getId(), category);
                
                log.info("✅ Category imported: {}", category.getName());
            }

            return categoryMap;

        } catch (Exception e) {
            logWarning(jobId, "Category import failed: " + e.getMessage());
            return categoryMap; // Continue with empty category map
        }
    }

    /**
     * Import products.
     */
    private ImportResult importProducts(
            List<WooProductDto> wooProducts,
            Store store,
            Map<Long, Category> categoryMap,
            Long jobId,
            boolean importImages
    ) {
        log.info("📦 Importing {} products...", wooProducts.size());
        
        ImportResult result = new ImportResult();

        for (WooProductDto wooProduct : wooProducts) {
            try {
                // Skip variable products (MVP)
                if ("variable".equalsIgnoreCase(wooProduct.getType())) {
                    result.skipped++;
                    result.warnings.add(String.format(
                        "Variable product '%s' skipped (variants not supported in MVP)",
                        wooProduct.getName()
                    ));
                    logWarning(jobId, String.format(
                        "Skipped variable product: %s (ID: %d)",
                        wooProduct.getName(),
                        wooProduct.getId()
                    ));
                    continue;
                }

                // Check duplicate by externalSource + externalId
                var existingById = productRepository.findByStoreIdAndExternalSourceAndExternalId(
                    store.getId(),
                    EXTERNAL_SOURCE,
                    wooProduct.getId().toString()
                );

                if (existingById.isPresent()) {
                    result.skipped++;
                    log.debug("Product already imported (by ID): {}", wooProduct.getName());
                    continue;
                }

                // Check duplicate by SKU
                if (wooProduct.getSku() != null && !wooProduct.getSku().isEmpty()) {
                    var existingBySku = productRepository.findByStoreIdAndSku(
                        store.getId(),
                        wooProduct.getSku()
                    );

                    if (existingBySku.isPresent()) {
                        result.skipped++;
                        log.debug("Product already imported (by SKU): {}", wooProduct.getName());
                        continue;
                    }
                }

                // Import product
                Product product = createProductFromWooCommerce(wooProduct, store, categoryMap);
                
                // Import image (optional)
                if (importImages && wooProduct.getImages() != null && !wooProduct.getImages().isEmpty()) {
                    String imageUrl = wooProduct.getImages().get(0).getSrc();
                    boolean imageImported = imageService.importProductImage(product, imageUrl, store, jobId);
                    
                    if (!imageImported) {
                        result.warnings.add(String.format(
                            "Image import failed for product '%s'",
                            product.getTitle()
                        ));
                    }
                }

                // Save product
                product = productRepository.save(product);
                result.imported++;
                
                log.info("✅ Product imported: {} (ID: {})", product.getTitle(), product.getId());

            } catch (Exception e) {
                result.failed++;
                logError(jobId, String.format(
                    "Failed to import product '%s': %s",
                    wooProduct.getName(),
                    e.getMessage()
                ));
            }
        }

        return result;
    }

    /**
     * Create Product entity from WooCommerce DTO.
     */
    private Product createProductFromWooCommerce(
            WooProductDto wooProduct,
            Store store,
            Map<Long, Category> categoryMap
    ) {
        Product product = new Product();
        
        // Basic fields
        product.setStore(store);
        product.setTitle(wooProduct.getName());
        product.setDescription(buildDescription(wooProduct));
        product.setSku(wooProduct.getSku());
        
        // Price (use regular_price if available, otherwise price)
        BigDecimal price = parsePrice(
            wooProduct.getRegularPrice() != null ? wooProduct.getRegularPrice() : wooProduct.getPrice()
        );
        product.setBasePrice(price != null ? price : BigDecimal.ZERO);
        
        // Status
        product.setStatus(mapStatus(wooProduct.getStatus()));
        
        // Stock
        if (wooProduct.getStockQuantity() != null) {
            product.setStock(wooProduct.getStockQuantity());
        }
        
        // Category (first category only, MVP)
        if (wooProduct.getCategories() != null && !wooProduct.getCategories().isEmpty()) {
            Long wooCategoryId = wooProduct.getCategories().get(0).getId();
            Category category = categoryMap.get(wooCategoryId);
            if (category != null) {
                product.setCategory(category);
            }
        }
        
        // External fields
        product.setExternalSource(EXTERNAL_SOURCE);
        product.setExternalId(wooProduct.getId().toString());
        product.setExternalSku(wooProduct.getSku());
        product.setExternalStoreUrl(null); // Could be set if needed
        product.setLastImportedAt(LocalDateTime.now());
        
        return product;
    }

    /**
     * Build product description.
     */
    private String buildDescription(WooProductDto wooProduct) {
        if (wooProduct.getDescription() != null && !wooProduct.getDescription().isEmpty()) {
            return wooProduct.getDescription();
        }
        if (wooProduct.getShortDescription() != null && !wooProduct.getShortDescription().isEmpty()) {
            return wooProduct.getShortDescription();
        }
        return "";
    }

    /**
     * Parse price string to BigDecimal.
     */
    private BigDecimal parsePrice(String priceStr) {
        if (priceStr == null || priceStr.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(priceStr);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse price: {}", priceStr);
            return null;
        }
    }

    /**
     * Map WooCommerce status to ProductStatus.
     */
    private ProductStatus mapStatus(String wooStatus) {
        if ("publish".equalsIgnoreCase(wooStatus)) {
            return ProductStatus.ACTIVE;
        }
        if ("draft".equalsIgnoreCase(wooStatus)) {
            return ProductStatus.DRAFT;
        }
        return ProductStatus.DRAFT; // Default
    }

    /**
     * Generate unique slug.
     */
    private String generateSlug(String name, Long storeId) {
        String baseSlug = name.toLowerCase()
                .replaceAll("[^a-z0-9\\-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        
        // Check uniqueness
        int counter = 1;
        String slug = baseSlug;
        while (categoryRepository.existsByStoreIdAndSlug(storeId, slug)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }
        
        return slug;
    }

    /**
     * Fetch products to import based on request.
     */
    private List<WooProductDto> fetchProductsToImport(
            WooCommerceConfig config,
            WooCommerceImportRequest request
    ) {
        // If specific product IDs requested, fetch those
        // For MVP: Just fetch first page (already done in preview)
        // In production, we'd fetch by IDs
        
        // For now: Fetch first 50 products
        return apiClient.getProducts(config, 1, MAX_IMPORT_SIZE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Logging
    // ─────────────────────────────────────────────────────────────────────────

    private void logSuccess(Long jobId, String message) {
        log.info("✅ {}", message);
        saveLog(jobId, "SUCCESS", message, null);
    }

    private void logInfo(Long jobId, String message) {
        log.info("ℹ️ {}", message);
        saveLog(jobId, "INFO", message, null);
    }

    private void logWarning(Long jobId, String message) {
        log.warn("⚠️ {}", message);
        saveLog(jobId, "WARNING", message, null);
    }

    private void logError(Long jobId, String message) {
        log.error("❌ {}", message);
        saveLog(jobId, "ERROR", message, null);
    }

    private void saveLog(Long jobId, String level, String message, String productName) {
        // Fetch store from job if needed (for MVP: minimal fix)
        WooCommerceImportLog logEntry = new WooCommerceImportLog();
        
        // Try to get store from job
        if (jobId != null) {
            importJobRepository.findById(jobId).ifPresent(job -> {
                logEntry.setStore(job.getStore());  // ✅ FIX Bug #2
            });
        }
        
        logEntry.setStatus(level); // SUCCESS, WARNING, ERROR
        logEntry.setErrorMessage(message);
        logEntry.setProductName(productName);
        logEntry.setWoocommerceProductId(0L); // Temp value for MVP
        
        // Only save if store is set (to avoid constraint violation)
        if (logEntry.getStore() != null) {
            importLogRepository.save(logEntry);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Classes
    // ─────────────────────────────────────────────────────────────────────────

    private static class ImportResult {
        int imported = 0;
        int skipped = 0;
        int failed = 0;
        List<String> warnings = new ArrayList<>();
    }
}
