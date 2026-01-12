package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.repository.*;
import storebackend.service.CartService;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/cart")
@RequiredArgsConstructor
@Slf4j
public class CartController {
    private final CartService cartService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCart(
            @RequestParam(required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            Cart cart;

            // Prüfe ob User eingeloggt ist (JWT vorhanden)
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                Long userId = extractUserIdFromToken(token);
                log.info("🛒 Lade Warenkorb für userId: {}", userId);

                // Hole Cart per userId
                cart = cartService.getCartByUser(userId);
            } else if (sessionId != null) {
                // Fallback für Gast-Warenkörbe
                log.info("🛒 Lade Warenkorb für sessionId: {}", sessionId);
                cart = cartService.getCartBySessionId(sessionId);
            } else {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Either sessionId or Authorization required"));
            }

            List<CartItem> items = cartService.getCartItems(cart.getId());
            return ResponseEntity.ok(buildCartResponse(cart, items));

        } catch (RuntimeException e) {
            log.warn("Warenkorb nicht gefunden: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("items", List.of(), "itemCount", 0, "subtotal", 0));
        }
    }

    @PostMapping("/items")
    public ResponseEntity<CartItem> addItemToCart(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Long storeId = Long.valueOf(request.get("storeId").toString());
        Long variantId = Long.valueOf(request.get("variantId").toString());
        Integer quantity = Integer.valueOf(request.get("quantity").toString());

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        Cart cart;

        // Prüfe ob User eingeloggt ist
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Long userId = extractUserIdFromToken(token);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            log.info("➕ Füge Artikel zu Warenkorb hinzu für userId: {}", userId);
            cart = cartService.getOrCreateCart(null, user, store);
        } else {
            // Fallback für Gast-Warenkörbe
            String sessionId = (String) request.get("sessionId");
            if (sessionId == null) {
                throw new RuntimeException("SessionId required for guest users");
            }
            log.info("➕ Füge Artikel zu Gast-Warenkorb hinzu: {}", sessionId);
            cart = cartService.getOrCreateCart(sessionId, null, store);
        }

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
    public ResponseEntity<Void> clearCart(
            @RequestParam(required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            Cart cart;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                Long userId = extractUserIdFromToken(token);
                cart = cartService.getCartByUser(userId);
            } else if (sessionId != null) {
                cart = cartService.getCartBySessionId(sessionId);
            } else {
                return ResponseEntity.badRequest().build();
            }

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

    /**
     * Extrahiert UserId aus JWT Token
     */
    private Long extractUserIdFromToken(String token) {
        try {
            // Parse JWT Token (Base64 decode des Payload)
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                String payload = new String(Base64.getDecoder().decode(parts[1]));
                // Extrahiere userId aus JSON
                // {"sub":"123","email":"user@test.de",...}
                if (payload.contains("\"sub\":\"")) {
                    String userIdStr = payload.split("\"sub\":\"")[1].split("\"")[0];
                    return Long.parseLong(userIdStr);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Could not extract userId from token: " + e.getMessage());
        }
        throw new RuntimeException("Invalid token format");
    }
}
