package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductTierPriceDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
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
        // Prüfe über StoreService
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            return userStores.stream().anyMatch(s -> s.getId().equals(storeId));
        } catch (Exception e) {
            log.error("Error checking store access", e);
            return false;
        }
    }

    /**
     * Gibt alle Preisstufen für ein Produkt zurück.
     */
    @GetMapping
    public ResponseEntity<List<ProductTierPriceDTO>> getTierPrices(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {
        
        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
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
        
        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
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
        
        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
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
        
        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        tierPriceService.deleteTierPrice(id);
        return ResponseEntity.noContent().build();
    }
}
