package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.WishlistDTO;
import storebackend.dto.WishlistItemDTO;
import storebackend.entity.User;
import storebackend.enums.WishlistPriority;
import storebackend.repository.UserRepository;
import storebackend.service.WishlistService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/wishlists")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<WishlistDTO> createWishlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long storeId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String description) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        WishlistDTO created = wishlistService.createWishlist(storeId, user.getId(), name, description);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<WishlistDTO>> getMyWishlists(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long storeId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        List<WishlistDTO> wishlists = wishlistService.getCustomerWishlists(storeId, user.getId());
        return ResponseEntity.ok(wishlists);
    }

    @GetMapping("/default")
    public ResponseEntity<WishlistDTO> getDefaultWishlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long storeId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        WishlistDTO wishlist = wishlistService.getOrCreateDefaultWishlist(storeId, user.getId());
        return ResponseEntity.ok(wishlist);
    }

    @GetMapping("/{wishlistId}")
    public ResponseEntity<WishlistDTO> getWishlistById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wishlistId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        WishlistDTO wishlist = wishlistService.getWishlistById(wishlistId, user.getId());
        return ResponseEntity.ok(wishlist);
    }

    @GetMapping("/shared/{shareToken}")
    public ResponseEntity<WishlistDTO> getPublicWishlist(@PathVariable String shareToken) {
        WishlistDTO wishlist = wishlistService.getPublicWishlist(shareToken);
        return ResponseEntity.ok(wishlist);
    }

    @PostMapping("/{wishlistId}/items")
    public ResponseEntity<WishlistItemDTO> addToWishlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wishlistId,
            @RequestBody Map<String, Object> request) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        Long productId = Long.valueOf(request.get("productId").toString());
        Long variantId = request.get("variantId") != null ? Long.valueOf(request.get("variantId").toString()) : null;
        String priorityStr = request.get("priority") != null ? request.get("priority").toString() : null;
        WishlistPriority priority = priorityStr != null ? WishlistPriority.valueOf(priorityStr) : WishlistPriority.MEDIUM;
        String note = request.get("note") != null ? request.get("note").toString() : null;

        WishlistItemDTO item = wishlistService.addToWishlist(wishlistId, user.getId(), productId, variantId, priority, note);
        return ResponseEntity.ok(item);
    }

    @DeleteMapping("/{wishlistId}/items/{itemId}")
    public ResponseEntity<Void> removeFromWishlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wishlistId,
            @PathVariable Long itemId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        wishlistService.removeFromWishlist(wishlistId, user.getId(), itemId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{wishlistId}/share")
    public ResponseEntity<Map<String, String>> shareWishlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wishlistId,
            @RequestParam(defaultValue = "true") boolean makePublic) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        String shareToken = wishlistService.shareWishlist(wishlistId, user.getId(), makePublic);
        return ResponseEntity.ok(Map.of("shareToken", shareToken != null ? shareToken : ""));
    }

    @DeleteMapping("/{wishlistId}")
    public ResponseEntity<Void> deleteWishlist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long wishlistId) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        wishlistService.deleteWishlist(wishlistId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getWishlistItemCount(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Benutzer nicht gefunden"));

        long count = wishlistService.countWishlistItems(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }
}

