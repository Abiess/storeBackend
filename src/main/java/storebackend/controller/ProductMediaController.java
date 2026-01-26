package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductMediaDTO;
import storebackend.entity.*;
import storebackend.repository.*;
import storebackend.service.ProductMediaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/media")
@RequiredArgsConstructor
public class ProductMediaController {
    private final ProductMediaService productMediaService;
    private final ProductRepository productRepository;
    private final MediaRepository mediaRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    /**
     * PUBLIC ENDPOINT - Holt Medien für ein Produkt (öffentlich zugänglich)
     * Dieser Endpoint ist für die Storefront gedacht und erfordert KEINE Authentifizierung
     */
    @GetMapping
    public ResponseEntity<List<ProductMediaDTO>> getProductMedia(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        // Öffentlicher Zugriff erlaubt - kein Auth-Check!
        // Prüfe nur, ob Store und Produkt existieren
        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return ResponseEntity.notFound().build();
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null || !product.getStore().getId().equals(storeId)) {
            return ResponseEntity.notFound().build();
        }

        // Gib Medien als DTOs zurück (mit vollständigen URLs)
        return ResponseEntity.ok(productMediaService.getMediaDTOsByProduct(productId));
    }

    @PostMapping
    public ResponseEntity<ProductMedia> addMediaToProduct(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Long mediaId = Long.valueOf(request.get("mediaId").toString());
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found"));

        ProductMedia productMedia = new ProductMedia();
        productMedia.setProduct(product);
        productMedia.setMedia(media);
        productMedia.setIsPrimary((Boolean) request.getOrDefault("isPrimary", false));
        productMedia.setSortOrder((Integer) request.getOrDefault("sortOrder", 0));

        return ResponseEntity.ok(productMediaService.addMediaToProduct(productMedia));
    }

    @PutMapping("/{mediaId}")
    public ResponseEntity<ProductMedia> updateProductMedia(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long mediaId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        ProductMedia productMedia = new ProductMedia();
        if (request.containsKey("sortOrder")) {
            productMedia.setSortOrder((Integer) request.get("sortOrder"));
        }
        if (request.containsKey("isPrimary")) {
            productMedia.setIsPrimary((Boolean) request.get("isPrimary"));
        }

        return ResponseEntity.ok(productMediaService.updateProductMedia(mediaId, productMedia));
    }

    @PostMapping("/{mediaId}/set-primary")
    public ResponseEntity<ProductMedia> setPrimaryImage(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long mediaId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(productMediaService.setPrimaryImage(productId, mediaId));
    }

    @DeleteMapping("/{mediaId}")
    public ResponseEntity<Void> deleteProductMedia(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long mediaId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        productMediaService.deleteProductMedia(mediaId);
        return ResponseEntity.noContent().build();
    }
}
