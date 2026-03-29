package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.GenerateVariantsRequest;
import storebackend.dto.ProductVariantDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.service.ProductVariantService;
import storebackend.service.StoreService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/variants")
@Tag(name = "Product Variants", description = "Product variant management APIs")
@RequiredArgsConstructor
@Slf4j
public class ProductVariantController {

    private final ProductVariantService variantService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final StoreService storeService;

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("getCurrentUser: No authentication found");
            return null;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    /**
     * Prüft, ob der Benutzer Zugriff auf den Store hat
     * - Owner hat immer Zugriff
     * - Prüft auch über StoreService.getStoresByUserId() für Team-Mitglieder
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

        // Prüfe, ob der User über StoreService Zugriff hat (z.B. Team-Mitglied)
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

    @Operation(summary = "Get all variants for a product")
    @GetMapping
    public ResponseEntity<List<ProductVariantDTO>> getVariants(
            @PathVariable Long storeId,
            @PathVariable Long productId) {

        User user = getCurrentUser();
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
            @PathVariable Long variantId) {

        User user = getCurrentUser();
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
            @RequestBody ProductVariantDTO request) {

        User user = getCurrentUser();
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
            @RequestBody ProductVariantDTO request) {

        log.info("=== UPDATE VARIANT REQUEST ===");
        log.info("Store ID: {}, Product ID: {}, Variant ID: {}", storeId, productId, variantId);
        
        User user = getCurrentUser();
        log.info("Current user: {}", user != null ? user.getEmail() + " (ID: " + user.getId() + ")" : "NULL");
        
        if (!hasStoreAccess(storeId, user)) {
            log.error("Access denied for user {} to store {}", user != null ? user.getId() : "null", storeId);
            return ResponseEntity.status(403).build();
        }

        log.info("Access granted for user {} to store {}", user.getId(), storeId);

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.error("Store {} not found", storeId);
            return ResponseEntity.notFound().build();
        }

        log.info("Updating variant {} for product {} in store {}", variantId, productId, storeId);
        ProductVariantDTO variant = variantService.updateVariant(variantId, productId, store, request);
        log.info("Variant {} updated successfully", variantId);
        
        return ResponseEntity.ok(variant);
    }

    @Operation(summary = "Delete variant")
    @DeleteMapping("/{variantId}")
    public ResponseEntity<Void> deleteVariant(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long variantId) {

        User user = getCurrentUser();
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
            @RequestBody GenerateVariantsRequest request) {

        User user = getCurrentUser();
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

