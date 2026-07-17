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
import java.util.*;

/**
 * WooCommerce Import Service.
 * 
 * MVP Scope:
 * - Import categories (flat, no hierarchy)
 * - Import simple products (type=simple)
 * - Import customers (with address)
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
    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final storebackend.util.HtmlToTextConverter htmlToTextConverter;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

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

            // Import customers (if requested)
            CustomerImportResult customerResult = new CustomerImportResult();
            if (request.isImportCustomers()) {
                log.info("Importing WooCommerce customers for store {} (page {}, pageSize {})", 
                    storeId, request.getCustomerPage(), request.getCustomerPageSize());
                customerResult = importCustomers(
                    config, 
                    store, 
                    jobId, 
                    request.isImportOnlyCustomersWithOrders(),
                    request.getCustomerPage(),
                    request.getCustomerPageSize()
                );
            }

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
            
            if (request.isImportCustomers()) {
                logSuccess(jobId, String.format(
                    "Customers: %d created, %d linked, %d skipped, %d failed",
                    customerResult.created, customerResult.linked, customerResult.skipped, customerResult.failed
                ));
            }

            // Build response
            WooCommerceImportResponse.WooCommerceImportResponseBuilder builder = WooCommerceImportResponse.builder()
                    .jobId(jobId)
                    .status("COMPLETED")
                    .importedCount(result.imported)
                    .skippedCount(result.skipped)
                    .failedCount(result.failed)
                    .warnings(result.warnings)
                    .messageKey("woocommerce.import.success");
            
            if (request.isImportCustomers()) {
                builder.customersImported(customerResult.created)
                       .customersLinked(customerResult.linked)
                       .customersSkipped(customerResult.skipped)
                       .customersFailed(customerResult.failed)
                       .customerCurrentPage(customerResult.currentPage)
                       .customerNextPage(customerResult.nextPage)
                       .customerPageSize(customerResult.pageSize)
                       .hasMoreCustomers(customerResult.hasMore)
                       .importedCustomers(customerResult.importedCustomers);
            }
            
            return builder.build();

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
     * Konvertiert WooCommerce-HTML zu sauberem Klartext.
     */
    private String buildDescription(WooProductDto wooProduct) {
        // 1. Wähle Beschreibungsfeld (description bevorzugt, short_description als Fallback)
        String rawHtml = null;
        
        if (wooProduct.getDescription() != null && !wooProduct.getDescription().isEmpty()) {
            rawHtml = wooProduct.getDescription();
        } else if (wooProduct.getShortDescription() != null && !wooProduct.getShortDescription().isEmpty()) {
            rawHtml = wooProduct.getShortDescription();
        }
        
        if (rawHtml == null || rawHtml.isEmpty()) {
            return "";
        }
        
        // 2. HTML zu Klartext konvertieren (entfernt Tags, dekodiert Entities)
        String cleanText = htmlToTextConverter.convert(rawHtml);
        
        return cleanText != null ? cleanText : "";
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
        try {
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
            logEntry.setWoocommerceProductId(null); // null für Logs ohne Produktbezug
            
            // Only save if store is set (to avoid constraint violation)
            if (logEntry.getStore() != null) {
                importLogRepository.save(logEntry);
            } else {
                log.warn("⚠️ ImportLog not saved: store is null (jobId={})", jobId);
            }
        } catch (Exception e) {
            // Log-Fehler dürfen Import nicht crashen
            log.error("⚠️ Failed to save ImportLog: {} (level={}, message={})", 
                e.getMessage(), level, message);
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
    
    private static class CustomerImportResult {
        int created = 0;      // Neu erstellte User + Profile
        int linked = 0;       // Existierende User → neues Profile für Store
        int skipped = 0;      // Bereits im Store vorhanden
        int failed = 0;       // Fehler
        
        // Pagination
        int currentPage = 1;
        int nextPage = 2;
        int pageSize = 25;
        boolean hasMore = false;
        
        // Importierte neue Kunden (für Aktivierungsliste)
        List<storebackend.dto.woocommerce.ImportedCustomerDto> importedCustomers = new ArrayList<>();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Customer Import
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Import WooCommerce customers (paginated).
     * 
     * Security:
     * - NO WordPress passwords imported
     * - Users marked as emailVerified=false (must verify)
     * - Secure random password (properly encoded)
     * - Multi-tenant: User reuse + store-specific CustomerProfile
     * - ExternalId stored at CustomerProfile (store-specific)
     * 
     * @param config WooCommerce config
     * @param store Store
     * @param jobId Import job ID
     * @param onlyWithOrders Only import customers with orders
     * @param page Page number (1-based)
     * @param pageSize Customers per page (max 100)
     * @return Customer import result
     */
    private CustomerImportResult importCustomers(
            WooCommerceConfig config,
            Store store,
            Long jobId,
            boolean onlyWithOrders,
            int page,
            int pageSize
    ) {
        CustomerImportResult result = new CustomerImportResult();
        
        // Validate and clamp pageSize
        pageSize = Math.min(Math.max(pageSize, 10), 100);
        
        result.currentPage = page;
        result.pageSize = pageSize;
        
        try {
            // Fetch ONE page of customers from WooCommerce
            List<storebackend.dto.woocommerce.api.WooCustomerDto> wooCustomers = 
                apiClient.getCustomers(config, page, pageSize, null);
            
            log.info("Fetched {} customers from WooCommerce (page {}, pageSize {})", 
                wooCustomers.size(), page, pageSize);
            logInfo(jobId, String.format("Found %d customers on page %d", wooCustomers.size(), page));
            
            // Determine if there are more pages
            result.hasMore = wooCustomers.size() >= pageSize;
            result.nextPage = result.hasMore ? page + 1 : page;
            
            // Filter by orders if requested
            if (onlyWithOrders) {
                int originalCount = wooCustomers.size();
                wooCustomers = wooCustomers.stream()
                    .filter(c -> c.getOrdersCount() != null && c.getOrdersCount() > 0)
                    .toList();
                log.info("Filtered to {} customers with orders (from {})", wooCustomers.size(), originalCount);
                logInfo(jobId, String.format("Filtered to %d customers with orders", wooCustomers.size()));
            }
            
            for (storebackend.dto.woocommerce.api.WooCustomerDto wooCustomer : wooCustomers) {
                try {
                    // Skip if no email
                    if (wooCustomer.getEmail() == null || wooCustomer.getEmail().trim().isEmpty()) {
                        result.skipped++;
                        log.warn("Skipping customer {}: no email", wooCustomer.getId());
                        continue;
                    }
                    
                    String email = wooCustomer.getEmail().trim().toLowerCase();
                    
                    // Check if CustomerProfile already exists for this store + externalId
                    Optional<CustomerProfile> existingProfile = 
                        customerProfileRepository.findByStoreIdAndExternalSourceAndExternalId(
                            store.getId(), EXTERNAL_SOURCE, wooCustomer.getId().toString()
                        );
                    
                    if (existingProfile.isPresent()) {
                        result.skipped++;
                        log.info("Skipping customer {}: already imported to store {}", 
                            wooCustomer.getId(), store.getId());
                        continue;
                    }
                    
                    // Find or create User
                    User user = userRepository.findByEmail(email)
                        .orElseGet(() -> createUser(wooCustomer, email));
                    
                    boolean userCreated = user.getId() != null && 
                        userRepository.findByEmail(email).isEmpty();
                    
                    if (userCreated) {
                        user = userRepository.save(user);
                    }
                    
                    // Check if CustomerProfile already exists for this user + store
                    Optional<CustomerProfile> existingStoreProfile = 
                        customerProfileRepository.findByUserIdAndStoreId(user.getId(), store.getId());
                    
                    if (existingStoreProfile.isPresent()) {
                        result.skipped++;
                        log.info("Skipping customer {}: user {} already linked to store {}", 
                            wooCustomer.getId(), email, store.getId());
                        continue;
                    }
                    
                    // Create CustomerProfile (store-specific)
                    CustomerProfile profile = new CustomerProfile();
                    profile.setUser(user);
                    profile.setStore(store);
                    profile.setExternalSource(EXTERNAL_SOURCE);
                    profile.setExternalId(wooCustomer.getId().toString());
                    profile.setFirstName(wooCustomer.getFirstName());
                    profile.setLastName(wooCustomer.getLastName());
                    profile.setPhone(wooCustomer.getBilling() != null ? wooCustomer.getBilling().getPhone() : null);
                    
                    // Import billing address
                    if (wooCustomer.getBilling() != null) {
                        profile.setDefaultBillingAddress(buildBillingAddress(wooCustomer.getBilling()));
                    }
                    
                    // Import shipping address
                    if (wooCustomer.getShipping() != null) {
                        profile.setDefaultShippingAddress(buildShippingAddress(wooCustomer.getShipping()));
                    }
                    
                    customerProfileRepository.save(profile);
                    
                    if (userCreated) {
                        result.created++;
                        
                        // Add to imported customers list (for activation UI)
                        result.importedCustomers.add(new storebackend.dto.woocommerce.ImportedCustomerDto(
                            user.getId(),
                            user.getEmail(),
                            user.getName(),
                            user.getEmailVerified(),
                            user.getActivationEmailSentAt()
                        ));
                        
                        log.info("✅ Created user + profile: {} ({}) for store {}", 
                            email, wooCustomer.getId(), store.getId());
                    } else {
                        result.linked++;
                        log.info("✅ Linked existing user {} to store {} (WooCustomer: {})", 
                            email, store.getId(), wooCustomer.getId());
                    }
                    
                } catch (Exception e) {
                    result.failed++;
                    log.error("❌ Failed to import customer {}: {}", 
                        wooCustomer.getId(), e.getMessage());
                    logError(jobId, String.format(
                        "Failed to import customer %s: %s", 
                        wooCustomer.getEmail(), e.getMessage()
                    ));
                }
            }
            
        } catch (Exception e) {
            log.error("❌ Customer import failed: {}", e.getMessage());
            logError(jobId, "Customer import failed: " + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Create new User from WooCommerce customer.
     * SECURITY: Password is properly encoded, not stored in plain text.
     */
    private User createUser(storebackend.dto.woocommerce.api.WooCustomerDto wooCustomer, String email) {
        User user = new User();
        user.setEmail(email);
        user.setName(buildFullName(wooCustomer.getFirstName(), wooCustomer.getLastName()));
        
        // SECURITY: Generate random password and encode it properly
        String randomPassword = generateRandomPassword();
        user.setPasswordHash(passwordEncoder.encode(randomPassword));
        // Do NOT log the plain password!
        
        user.setEmailVerified(false); // User must verify email
        user.setRoles(Set.of(storebackend.enums.Role.USER));
        user.setPreferredLanguage("de"); // Default
        
        return user;
    }
    
    /**
     * Build billing Address from WooCommerce data.
     */
    private Address buildBillingAddress(storebackend.dto.woocommerce.api.WooCustomerDto.BillingAddress billing) {
        Address address = new Address();
        address.setFirstName(billing.getFirstName());
        address.setLastName(billing.getLastName());
        address.setAddress1(billing.getAddress1());
        address.setAddress2(billing.getAddress2());
        address.setCity(billing.getCity());
        address.setPostalCode(billing.getPostcode());
        address.setCountry(billing.getCountry());
        address.setPhone(billing.getPhone());
        return address;
    }
    
    /**
     * Build shipping Address from WooCommerce data.
     */
    private Address buildShippingAddress(storebackend.dto.woocommerce.api.WooCustomerDto.ShippingAddress shipping) {
        Address address = new Address();
        address.setFirstName(shipping.getFirstName());
        address.setLastName(shipping.getLastName());
        address.setAddress1(shipping.getAddress1());
        address.setAddress2(shipping.getAddress2());
        address.setCity(shipping.getCity());
        address.setPostalCode(shipping.getPostcode());
        address.setCountry(shipping.getCountry());
        return address;
    }
    
    /**
     * Build full name from first and last name.
     */
    private String buildFullName(String firstName, String lastName) {
        if (firstName == null || firstName.isEmpty()) {
            return lastName != null ? lastName : "Customer";
        }
        if (lastName == null || lastName.isEmpty()) {
            return firstName;
        }
        return firstName + " " + lastName;
    }
    
    /**
     * Generate random secure password.
     */
    private String generateRandomPassword() {
        return java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
