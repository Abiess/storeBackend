package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.repository.*;
import storebackend.service.CartService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCart(@RequestParam(required = false) String sessionId) {
        if (sessionId == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Cart cart = cartService.getCartBySessionId(sessionId);
            List<CartItem> items = cartService.getCartItems(cart.getId());

            return ResponseEntity.ok(buildCartResponse(cart, items));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("items", List.of(), "itemCount", 0, "subtotal", 0));
        }
    }

    @PostMapping("/items")
    public ResponseEntity<CartItem> addItemToCart(@RequestBody Map<String, Object> request) {
        String sessionId = (String) request.get("sessionId");
        Long storeId = Long.valueOf(request.get("storeId").toString());
        Long variantId = Long.valueOf(request.get("variantId").toString());
        Integer quantity = Integer.valueOf(request.get("quantity").toString());

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        Cart cart = cartService.getOrCreateCart(sessionId, null, store);
        CartItem item = cartService.addItemToCart(cart.getId(), variantId, quantity);

        return ResponseEntity.ok(item);
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartItem> updateCartItem(
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> request) {

        Integer quantity = Integer.valueOf(request.get("quantity").toString());
        CartItem updated = cartService.updateCartItemQuantity(itemId, quantity);

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeCartItem(@PathVariable Long itemId) {
        cartService.removeCartItem(itemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(@RequestParam String sessionId) {
        try {
            Cart cart = cartService.getCartBySessionId(sessionId);
            cartService.clearCart(cart.getId());
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private Map<String, Object> buildCartResponse(Cart cart, List<CartItem> items) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", cart.getId());
        response.put("sessionId", cart.getSessionId());
        response.put("storeId", cart.getStore().getId());
        response.put("items", items);
        response.put("itemCount", items.stream().mapToInt(CartItem::getQuantity).sum());
        response.put("subtotal", items.stream()
                .map(item -> item.getPriceSnapshot().multiply(java.math.BigDecimal.valueOf(item.getQuantity())))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add));
        response.put("expiresAt", cart.getExpiresAt());
        return response;
    }
}

