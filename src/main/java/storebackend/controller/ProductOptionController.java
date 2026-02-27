package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductOptionDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductOptionService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/options")
@RequiredArgsConstructor
public class ProductOptionController {
    private final ProductOptionService productOptionService;
    private final StoreRepository storeRepository;

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

        log.warn("hasStoreAccess: User {} is not owner of store {}", user.getId(), storeId);
        return false;
    }

    @GetMapping
    public ResponseEntity<List<ProductOptionDTO>> getProductOptions(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        log.info("GET /api/stores/{}/products/{}/options - User: {}",
                 storeId, productId, user != null ? user.getId() : "null");

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));


        List<ProductOptionDTO> options = productOptionService.getOptionsByProduct(productId, store);
        log.info("Returning {} options for product {}", options.size(), productId);
        return ResponseEntity.ok(options);
    }

    @PostMapping
    public ResponseEntity<ProductOptionDTO> createProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody ProductOptionDTO request,
            @AuthenticationPrincipal User user) {

        log.info("POST /api/stores/{}/products/{}/options - Option: {}",
                 storeId, productId, request.getName());

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        ProductOptionDTO option = productOptionService.createOption(productId, store, request);
        log.info("Created option {} for product {}", option.getId(), productId);
        return ResponseEntity.ok(option);
    }

    @PutMapping("/{optionId}")
    public ResponseEntity<ProductOptionDTO> updateProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long optionId,
            @RequestBody ProductOptionDTO request,
            @AuthenticationPrincipal User user) {

        log.info("PUT /api/stores/{}/products/{}/options/{}", storeId, productId, optionId);

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        ProductOptionDTO option = productOptionService.updateOption(optionId, productId, store, request);
        log.info("Updated option {} for product {}", optionId, productId);
        return ResponseEntity.ok(option);
    }

    @DeleteMapping("/{optionId}")
    public ResponseEntity<Void> deleteProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long optionId,
            @AuthenticationPrincipal User user) {

        log.info("DELETE /api/stores/{}/products/{}/options/{}", storeId, productId, optionId);

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        productOptionService.deleteOption(optionId, productId, store);
        log.info("Deleted option {} for product {}", optionId, productId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/stores/{storeId}/products/{productId}/variants/regenerate
     * Regeneriert alle Varianten basierend auf den aktuellen Optionen
     */
    @PostMapping("/../variants/regenerate")
    public ResponseEntity<RegenerateResponse> regenerateVariants(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        log.info("POST /api/stores/{}/products/{}/variants/regenerate", storeId, productId);

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        int count = productOptionService.regenerateVariants(productId, store);
        log.info("Regenerated {} variants for product {}", count, productId);
        return ResponseEntity.ok(new RegenerateResponse(count, "Varianten erfolgreich regeneriert"));
    }

    /**
     * Response DTO für Varianten-Regenerierung
     */
    public record RegenerateResponse(
            int variantCount,
            String message
    ) {}
}
