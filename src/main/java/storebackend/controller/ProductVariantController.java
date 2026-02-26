package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.GenerateVariantsRequest;
import storebackend.dto.ProductVariantDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductVariantService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/variants")
@Tag(name = "Product Variants", description = "Product variant management APIs")
@RequiredArgsConstructor
@Slf4j
public class ProductVariantController {

    private final ProductVariantService variantService;
    private final StoreRepository storeRepository;

    private boolean hasStoreAccess(Long storeId, User user) {
        if (user == null) return false;
        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return false;
        return store.getOwner().getId().equals(user.getId());
    }

    @Operation(summary = "Get all variants for a product")
    @GetMapping
    public ResponseEntity<List<ProductVariantDTO>> getVariants(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        List<ProductVariantDTO> variants = variantService.getVariantsByProduct(productId, store);
        return ResponseEntity.ok(variants);
    }

    @Operation(summary = "Get single variant")
    @GetMapping("/{variantId}")
    public ResponseEntity<ProductVariantDTO> getVariant(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @AuthenticationPrincipal User user) {

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        ProductVariantDTO variant = variantService.getVariantById(variantId, productId, store);
        return ResponseEntity.ok(variant);
    }

    @Operation(summary = "Create a new variant")
    @PostMapping
    public ResponseEntity<ProductVariantDTO> createVariant(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody ProductVariantDTO request,
            @AuthenticationPrincipal User user) {

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        ProductVariantDTO variant = variantService.createVariant(productId, store, request);
        return ResponseEntity.ok(variant);
    }

    @Operation(summary = "Update variant")
    @PutMapping("/{variantId}")
    public ResponseEntity<ProductVariantDTO> updateVariant(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @RequestBody ProductVariantDTO request,
            @AuthenticationPrincipal User user) {

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        ProductVariantDTO variant = variantService.updateVariant(variantId, productId, store, request);
        return ResponseEntity.ok(variant);
    }

    @Operation(summary = "Delete variant")
    @DeleteMapping("/{variantId}")
    public ResponseEntity<Void> deleteVariant(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @AuthenticationPrincipal User user) {

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        variantService.deleteVariant(variantId, productId, store);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Generate all variant combinations from options")
    @PostMapping("/generate")
    public ResponseEntity<List<ProductVariantDTO>> generateVariants(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody GenerateVariantsRequest request,
            @AuthenticationPrincipal User user) {

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        request.setProductId(productId);
        List<ProductVariantDTO> variants = variantService.generateVariants(request, store);
        return ResponseEntity.ok(variants);
    }
}

