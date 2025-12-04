package storebackend.controller;

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

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getProducts(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        return ResponseEntity.ok(productService.getProductsByStore(store));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductDTO> getProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        return ResponseEntity.ok(productService.getProductById(productId, store));
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(
            @PathVariable Long storeId,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal User user) {

        log.info("Creating product - Store ID: {}, User ID: {}", storeId, user.getId());

        // Verwende die Repository-Methode für Owner-Check (direkter SQL-Query)
        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            log.warn("Access denied - User {} does not own Store {}", user.getId(), storeId);
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        log.info("Permission granted - creating product");
        return ResponseEntity.ok(productService.createProduct(request, store, user));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal User user) {

        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        return ResponseEntity.ok(productService.updateProduct(productId, request, store));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
        productService.deleteProduct(productId, store);
        return ResponseEntity.noContent().build();
    }
}
