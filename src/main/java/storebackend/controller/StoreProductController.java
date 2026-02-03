package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ImportProductRequest;
import storebackend.dto.StoreProductDTO;
import storebackend.entity.Store;
import storebackend.service.StoreProductService;
import storebackend.service.StoreService;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;

/**
 * REST Controller for reseller product imports.
 * Resellers can import supplier products into their store.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/imported-products")
@RequiredArgsConstructor
public class StoreProductController {

    private final StoreProductService storeProductService;
    private final StoreService storeService;

    /**
     * Get all imported products for a store.
     * GET /api/stores/{storeId}/imported-products
     */
    @GetMapping
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<List<StoreProductDTO>> getImportedProducts(
            @PathVariable Long storeId,
            @RequestParam(required = false, defaultValue = "true") Boolean activeOnly,
            Principal principal) {

        Store store = storeService.getStoreById(storeId);
        // TODO: Verify ownership (store.getOwner().getEmail().equals(principal.getName()))

        List<StoreProductDTO> products = storeProductService.getStoreProducts(store, activeOnly);
        return ResponseEntity.ok(products);
    }

    /**
     * Import a supplier product into the store.
     * POST /api/stores/{storeId}/imported-products
     *
     * Request body:
     * {
     *   "supplierProductId": 123,
     *   "retailPrice": 75.00,  // Optional: will use recommended margin if not provided
     *   "marginPercentage": 0.30  // Optional
     * }
     */
    @PostMapping
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<StoreProductDTO> importProduct(
            @PathVariable Long storeId,
            @RequestBody ImportProductRequest request,
            Principal principal) {

        Store store = storeService.getStoreById(storeId);
        // TODO: Verify ownership

        StoreProductDTO imported = storeProductService.importProductToStore(store, request);
        return ResponseEntity.ok(imported);
    }

    /**
     * Update retail price for an imported product.
     * PUT /api/stores/{storeId}/imported-products/{productId}/price
     */
    @PutMapping("/{productId}/price")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<StoreProductDTO> updatePrice(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody BigDecimal newPrice,
            Principal principal) {

        Store store = storeService.getStoreById(storeId);
        // TODO: Verify ownership

        StoreProductDTO updated = storeProductService.updateRetailPrice(productId, store, newPrice);
        return ResponseEntity.ok(updated);
    }

    /**
     * Toggle active status of imported product.
     * POST /api/stores/{storeId}/imported-products/{productId}/toggle
     */
    @PostMapping("/{productId}/toggle")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<StoreProductDTO> toggleActive(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            Principal principal) {

        Store store = storeService.getStoreById(storeId);
        // TODO: Verify ownership

        StoreProductDTO updated = storeProductService.toggleActive(productId, store);
        return ResponseEntity.ok(updated);
    }

    /**
     * Remove imported product from store.
     * DELETE /api/stores/{storeId}/imported-products/{productId}
     */
    @DeleteMapping("/{productId}")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<Void> removeImportedProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            Principal principal) {

        Store store = storeService.getStoreById(storeId);
        // TODO: Verify ownership

        storeProductService.removeImportedProduct(productId, store);
        return ResponseEntity.noContent().build();
    }
}

