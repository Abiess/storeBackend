package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.Product;
import storebackend.entity.ProductOption;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.service.ProductOptionService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/options")
@RequiredArgsConstructor
public class ProductOptionController {
    private final ProductOptionService productOptionService;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ProductOption>> getProductOptions(@PathVariable Long productId) {
        return ResponseEntity.ok(productOptionService.getOptionsByProduct(productId));
    }

    @PostMapping
    public ResponseEntity<ProductOption> createProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @RequestBody ProductOption productOption,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        productOption.setProduct(product);
        return ResponseEntity.ok(productOptionService.createOption(productOption));
    }

    @PutMapping("/{optionId}")
    public ResponseEntity<ProductOption> updateProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long optionId,
            @RequestBody ProductOption productOption,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(productOptionService.updateOption(optionId, productOption));
    }

    @DeleteMapping("/{optionId}")
    public ResponseEntity<Void> deleteProductOption(
            @PathVariable Long storeId,
            @PathVariable Long productId,
            @PathVariable Long optionId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        productOptionService.deleteOption(optionId);
        return ResponseEntity.noContent().build();
    }
}

