package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.SavedCartDTO;
import storebackend.dto.SavedCartItemDTO;
import storebackend.entity.User;
import storebackend.repository.UserRepository;
import storebackend.service.SavedCartService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/saved-carts")
@RequiredArgsConstructor
public class SavedCartController {

    private final SavedCartService savedCartService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<SavedCartDTO> saveCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> request) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        Long storeId = Long.valueOf(request.get("storeId").toString());
        String name = request.get("name") != null ? request.get("name").toString() : null;
        String description = request.get("description") != null ? request.get("description").toString() : null;
        Integer expirationDays = request.get("expirationDays") != null ?
                Integer.valueOf(request.get("expirationDays").toString()) : null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) request.get("items");
        List<SavedCartItemDTO> items = null;

        if (itemsRaw != null) {
            items = itemsRaw.stream().map(itemMap -> {
                SavedCartItemDTO dto = new SavedCartItemDTO();
                dto.setProductId(Long.valueOf(itemMap.get("productId").toString()));
                dto.setVariantId(Long.valueOf(itemMap.get("variantId").toString()));
                dto.setQuantity(Integer.valueOf(itemMap.get("quantity").toString()));
                dto.setPriceSnapshot(new java.math.BigDecimal(itemMap.get("priceSnapshot").toString()));
                dto.setProductSnapshot(itemMap.get("productSnapshot") != null ?
                        itemMap.get("productSnapshot").toString() : null);
                return dto;
            }).collect(java.util.stream.Collectors.toList());
        }

        SavedCartDTO saved = savedCartService.saveCart(storeId, user.getId(), name, description, items, expirationDays);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<SavedCartDTO>> getMySavedCarts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long storeId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        List<SavedCartDTO> savedCarts = savedCartService.getCustomerSavedCarts(storeId, user.getId());
        return ResponseEntity.ok(savedCarts);
    }

    @GetMapping("/{savedCartId}")
    public ResponseEntity<SavedCartDTO> getSavedCartById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long savedCartId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        SavedCartDTO savedCart = savedCartService.getSavedCartById(savedCartId, user.getId());
        return ResponseEntity.ok(savedCart);
    }

    @PostMapping("/{savedCartId}/restore")
    public ResponseEntity<Void> restoreCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long savedCartId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        savedCartService.restoreCart(savedCartId, user.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{savedCartId}")
    public ResponseEntity<Void> deleteSavedCart(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long savedCartId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        savedCartService.deleteSavedCart(savedCartId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getSavedCartCount(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        long count = savedCartService.countSavedCarts(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/cleanup-expired")
    public ResponseEntity<Map<String, Integer>> cleanupExpiredCarts() {
        int deletedCount = savedCartService.cleanupExpiredCarts();
        return ResponseEntity.ok(Map.of("deletedCount", deletedCount));
    }
}

