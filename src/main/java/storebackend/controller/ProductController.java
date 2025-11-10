package storebackend.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.ProductDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.service.ProductService;
import storebackend.service.StoreService;

import java.util.List;

@RestController
@RequestMapping("/stores/{storeId}/products")
public class ProductController {

    private final ProductService productService;
    private final StoreService storeService;

    public ProductController(ProductService productService, StoreService storeService) {
        this.productService = productService;
        this.storeService = storeService;
    }

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getProducts(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(productService.getProductsByStore(store));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductDTO> getProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(productService.getProductById(productId, store));
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(
            @PathVariable Long storeId,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(productService.createProduct(request, store));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(productService.updateProduct(productId, request, store));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        productService.deleteProduct(productId, store);
        return ResponseEntity.noContent().build();
    }
}

