package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.ProductDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductService;
import storebackend.service.StoreService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/products")
@Tag(name = "Products", description = "Product management APIs")
@Slf4j
public class ProductController {

    private final ProductService productService;
    private final StoreService storeService;
    private final StoreRepository storeRepository;

    public ProductController(ProductService productService, StoreService storeService, StoreRepository storeRepository) {
        this.productService = productService;
        this.storeService = storeService;
        this.storeRepository = storeRepository;
    }

    /**
     * Prüft, ob der Benutzer Zugriff auf den Store hat
     */
    private boolean hasStoreAccess(Long storeId, User user) {
        if (user == null) {
            log.warn("hasStoreAccess: User is null");
            return false;
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("hasStoreAccess: Store {} not found", storeId);
            return false;
        }

        // Owner hat immer Zugriff
        boolean isOwner = store.getOwner().getId().equals(user.getId());
        if (isOwner) {
            log.info("hasStoreAccess: User {} is owner of store {}", user.getId(), storeId);
            return true;
        }

        // Prüfe, ob der User über StoreService Zugriff hat
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            boolean hasAccess = userStores.stream().anyMatch(s -> s.getId().equals(storeId));
            log.info("hasStoreAccess: User {} has access via StoreService: {}", user.getId(), hasAccess);
            return hasAccess;
        } catch (Exception e) {
            log.error("hasStoreAccess: Error checking access for user {} to store {}: {}",
                user.getId(), storeId, e.getMessage());
            return false;
        }
    }

    @Operation(summary = "Get all products", description = "Returns all products for a specific store (public access)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved products"),
            @ApiResponse(responseCode = "404", description = "Store not found")
    })
    @GetMapping
    public ResponseEntity<List<ProductDTO>> getProducts(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        // GET-Requests auf Produkte sind öffentlich - kein Auth erforderlich!
        log.info("Getting products for store {} (user: {})", storeId, user != null ? user.getId() : "anonymous");

        // Prüfe nur, ob Store existiert
        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("Store {} not found", storeId);
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(productService.getProductsByStore(store));
    }

    @Operation(summary = "Get product by ID", description = "Returns a single product (public access)")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDTO> getProduct(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        // GET-Requests auf einzelne Produkte sind öffentlich - kein Auth erforderlich!
        log.info("Getting product {} from store {} (user: {})", productId, storeId, user != null ? user.getId() : "anonymous");

        // Prüfe nur, ob Store existiert
        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("Store {} not found", storeId);
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(productService.getProductById(productId, store));
    }

    @Operation(summary = "Create a new product", description = "Creates a new product with optional category assignment")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Product created successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized")
    })
    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal User user) {

        log.info("=== CREATE PRODUCT REQUEST ===");
        log.info("Store ID: {}", storeId);
        log.info("User: {}", user != null ? user.getId() + " (" + user.getEmail() + ")" : "NULL");
        log.info("Request: title={}, price={}, status={}", request.getTitle(), request.getBasePrice(), request.getStatus());

        if (user == null) {
            log.error("❌ User is null - authentication failed");
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            log.error("❌ ACCESS DENIED - User {} ({}) does not have access to Store {}",
                user.getId(), user.getEmail(), storeId);

            // Debug: Zeige welche Stores der User hat
            try {
                List<Store> userStores = storeService.getStoresByUserId(user.getId());
                log.error("User's stores: {}", userStores.stream()
                    .map(s -> s.getId() + " (" + s.getName() + ")")
                    .collect(java.util.stream.Collectors.joining(", ")));
            } catch (Exception e) {
                log.error("Could not fetch user's stores: {}", e.getMessage());
            }

            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        log.info("✅ Permission granted - creating product for store: {}", store.getName());
        ProductDTO created = productService.createProduct(request, store, user);
        log.info("✅ Product created successfully: {} (ID: {})", created.getTitle(), created.getId());
        return ResponseEntity.ok(created);
    }

    @Operation(summary = "Update product", description = "Updates an existing product including category assignment")
    @PutMapping("/{productId}")
    public ResponseEntity<ProductDTO> updateProduct(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        return ResponseEntity.ok(productService.updateProduct(productId, request, store));
    }

    @Operation(summary = "Delete product", description = "Deletes a product")
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        productService.deleteProduct(productId, store);
        return ResponseEntity.noContent().build();
    }
}
