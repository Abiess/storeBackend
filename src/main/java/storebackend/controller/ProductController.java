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
            return false;
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return false;
        }

        // Owner hat immer Zugriff
        if (store.getOwner().getId().equals(user.getId())) {
            return true;
        }

        // Prüfe, ob der User über StoreService Zugriff hat
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            return userStores.stream().anyMatch(s -> s.getId().equals(storeId));
        } catch (Exception e) {
            return false;
        }
    }

    @Operation(summary = "Get all products", description = "Returns all products for a specific store")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved products"),
            @ApiResponse(responseCode = "403", description = "Not authorized to access this store")
    })
    @GetMapping
    public ResponseEntity<List<ProductDTO>> getProducts(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        return ResponseEntity.ok(productService.getProductsByStore(store));
    }

    @Operation(summary = "Get product by ID", description = "Returns a single product")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDTO> getProduct(
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

        log.info("Creating product - Store ID: {}, User ID: {}", storeId, user.getId());

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            log.warn("Access denied - User {} does not have access to Store {}", user.getId(), storeId);
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        log.info("Permission granted - creating product");
        return ResponseEntity.ok(productService.createProduct(request, store, user));
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
