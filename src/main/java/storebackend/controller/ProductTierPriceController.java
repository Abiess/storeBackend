package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductTierPriceDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductTierPrice;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductTierPriceRepository;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductTierPriceService;
import storebackend.service.StoreService;

import java.util.List;

/**
 * REST-API für Staffelpreise / Mengenpreise.
 * 
 * Endpunkte:
 * GET    /api/stores/{storeId}/products/{productId}/tier-prices - Liste aller Preisstufen
 * POST   /api/stores/{storeId}/products/{productId}/tier-prices - Neue Preisstufe erstellen
 * PUT    /api/stores/{storeId}/products/{productId}/tier-prices/{id} - Preisstufe aktualisieren
 * DELETE /api/stores/{storeId}/products/{productId}/tier-prices/{id} - Preisstufe löschen
 */
@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/tier-prices")
@RequiredArgsConstructor
@Slf4j
public class ProductTierPriceController {

    private final ProductTierPriceService tierPriceService;
    private final StoreService storeService;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ProductTierPriceRepository tierPriceRepository;

    /**
     * Prüft, ob der Benutzer Zugriff auf den Store hat (wiederverwendet ProductController-Logik)
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

        // Prüfe über StoreService (Team-Mitglieder etc.)
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            boolean hasAccess = userStores.stream().anyMatch(s -> s.getId().equals(storeId));
            log.info("hasStoreAccess: User {} has access via StoreService: {}", user.getId(), hasAccess);
            return hasAccess;
        } catch (Exception e) {
            log.error("Error checking store access", e);
            return false;
        }
    }

    /**
     * Prüft, ob das Produkt zum Store gehört
     */
    private boolean validateProductBelongsToStore(Long productId, Long storeId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            log.warn("validateProductBelongsToStore: Product {} not found", productId);
            return false;
        }
        boolean belongs = product.getStore().getId().equals(storeId);
        if (!belongs) {
            log.warn("validateProductBelongsToStore: Product {} does not belong to store {}", productId, storeId);
        }
        return belongs;
    }

    /**
     * Prüft, ob die TierPrice zum Produkt und Store gehört
     */
    private boolean validateTierPriceBelongsToProduct(Long tierPriceId, Long productId, Long storeId) {
        ProductTierPrice tierPrice = tierPriceRepository.findById(tierPriceId).orElse(null);
        if (tierPrice == null) {
            log.warn("validateTierPriceBelongsToProduct: TierPrice {} not found", tierPriceId);
            return false;
        }
        boolean belongsToProduct = tierPrice.getProduct().getId().equals(productId);
        boolean belongsToStore = tierPrice.getProduct().getStore().getId().equals(storeId);
        if (!belongsToProduct || !belongsToStore) {
            log.warn("validateTierPriceBelongsToProduct: TierPrice {} does not belong to product {} or store {}", 
                tierPriceId, productId, storeId);
        }
        return belongsToProduct && belongsToStore;
    }

    /**
     * Gibt alle Preisstufen für ein Produkt zurück.
     */
    @GetMapping
    public ResponseEntity<List<ProductTierPriceDTO>> getTierPrices(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {
        
        log.info("GET /api/stores/{}/products/{}/tier-prices - User: {}", storeId, productId, user != null ? user.getId() : "null");

        if (!hasStoreAccess(storeId, user)) {
            log.warn("Access denied: User {} does not have access to store {}", user != null ? user.getId() : "null", storeId);
            return ResponseEntity.status(403).build();
        }

        if (!validateProductBelongsToStore(productId, storeId)) {
            log.warn("Access denied: Product {} does not belong to store {}", productId, storeId);
            return ResponseEntity.status(404).build();
        }

        List<ProductTierPriceDTO> tierPrices = tierPriceService.getTierPricesByProduct(productId);
        return ResponseEntity.ok(tierPrices);
    }

    /**
     * Erstellt eine neue Preisstufe.
     */
    @PostMapping
    public ResponseEntity<ProductTierPriceDTO> createTierPrice(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody ProductTierPriceDTO dto,
            @AuthenticationPrincipal User user) {
        
        log.info("POST /api/stores/{}/products/{}/tier-prices - User: {}", storeId, productId, user != null ? user.getId() : "null");

        if (!hasStoreAccess(storeId, user)) {
            log.warn("Access denied: User {} does not have access to store {}", user != null ? user.getId() : "null", storeId);
            return ResponseEntity.status(403).build();
        }

        if (!validateProductBelongsToStore(productId, storeId)) {
            log.warn("Access denied: Product {} does not belong to store {}", productId, storeId);
            return ResponseEntity.status(404).build();
        }

        // Validierung
        if (dto.getMinimumQuantity() == null || dto.getMinimumQuantity() <= 1) {
            return ResponseEntity.badRequest().build();
        }
        if (dto.getUnitPrice() == null || dto.getUnitPrice().signum() < 0) {
            return ResponseEntity.badRequest().build();
        }

        ProductTierPriceDTO created = tierPriceService.createTierPrice(productId, dto);
        return ResponseEntity.ok(created);
    }

    /**
     * Aktualisiert eine Preisstufe.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductTierPriceDTO> updateTierPrice(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long id,
            @RequestBody ProductTierPriceDTO dto,
            @AuthenticationPrincipal User user) {
        
        log.info("PUT /api/stores/{}/products/{}/tier-prices/{} - User: {}", storeId, productId, id, user != null ? user.getId() : "null");

        if (!hasStoreAccess(storeId, user)) {
            log.warn("Access denied: User {} does not have access to store {}", user != null ? user.getId() : "null", storeId);
            return ResponseEntity.status(403).build();
        }

        if (!validateProductBelongsToStore(productId, storeId)) {
            log.warn("Access denied: Product {} does not belong to store {}", productId, storeId);
            return ResponseEntity.status(404).build();
        }

        if (!validateTierPriceBelongsToProduct(id, productId, storeId)) {
            log.warn("Access denied: TierPrice {} does not belong to product {} or store {}", id, productId, storeId);
            return ResponseEntity.status(404).build();
        }

        // Validierung
        if (dto.getMinimumQuantity() == null || dto.getMinimumQuantity() <= 1) {
            return ResponseEntity.badRequest().build();
        }
        if (dto.getUnitPrice() == null || dto.getUnitPrice().signum() < 0) {
            return ResponseEntity.badRequest().build();
        }

        ProductTierPriceDTO updated = tierPriceService.updateTierPrice(id, dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * Löscht eine Preisstufe.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTierPrice(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        
        log.info("DELETE /api/stores/{}/products/{}/tier-prices/{} - User: {}", storeId, productId, id, user != null ? user.getId() : "null");

        if (!hasStoreAccess(storeId, user)) {
            log.warn("Access denied: User {} does not have access to store {}", user != null ? user.getId() : "null", storeId);
            return ResponseEntity.status(403).build();
        }

        if (!validateProductBelongsToStore(productId, storeId)) {
            log.warn("Access denied: Product {} does not belong to store {}", productId, storeId);
            return ResponseEntity.status(404).build();
        }

        if (!validateTierPriceBelongsToProduct(id, productId, storeId)) {
            log.warn("Access denied: TierPrice {} does not belong to product {} or store {}", id, productId, storeId);
            return ResponseEntity.status(404).build();
        }

        tierPriceService.deleteTierPrice(id);
        return ResponseEntity.noContent().build();
    }
}
