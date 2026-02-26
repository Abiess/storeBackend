package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductOptionDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductOptionService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/options")
@RequiredArgsConstructor
public class ProductOptionController {
    private final ProductOptionService productOptionService;
    private final StoreRepository storeRepository;

    @GetMapping
    public ResponseEntity<List<ProductOptionDTO>> getProductOptions(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        List<ProductOptionDTO> options = productOptionService.getOptionsByProduct(productId, store);
        return ResponseEntity.ok(options);
    }

    @PostMapping
    public ResponseEntity<ProductOptionDTO> createProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody ProductOptionDTO request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        ProductOptionDTO option = productOptionService.createOption(productId, store, request);
        return ResponseEntity.ok(option);
    }

    @PutMapping("/{optionId}")
    public ResponseEntity<ProductOptionDTO> updateProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long optionId,
            @RequestBody ProductOptionDTO request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        ProductOptionDTO option = productOptionService.updateOption(optionId, productId, store, request);
        return ResponseEntity.ok(option);
    }

    @DeleteMapping("/{optionId}")
    public ResponseEntity<Void> deleteProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long optionId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        productOptionService.deleteOption(optionId, productId, store);
        return ResponseEntity.noContent().build();
    }
}
