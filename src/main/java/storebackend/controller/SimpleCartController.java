package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Vereinfachter Warenkorb ohne Varianten
 * Arbeitet direkt mit Produkten
 */
@RestController
@RequestMapping("/api/public/simple-cart")
@RequiredArgsConstructor
@Slf4j
public class SimpleCartController {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final ProductVariantRepository productVariantRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCart(@RequestParam String sessionId) {
        try {
            Cart cart = cartRepository.findBySessionId(sessionId)
                    .orElse(null);

            if (cart == null) {
                return ResponseEntity.ok(Map.of(
                    "items", List.of(),
                    "itemCount", 0,
                    "subtotal", 0
                ));
            }

            List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
            BigDecimal subtotal = items.stream()
                    .map(item -> item.getPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();

            return ResponseEntity.ok(Map.of(
                "items", items,
                "itemCount", itemCount,
                "subtotal", subtotal
            ));
        } catch (Exception e) {
            log.error("Error loading cart: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                "items", List.of(),
                "itemCount", 0,
                "subtotal", 0
            ));
        }
    }

    /**
     * Gibt die Anzahl der Items im Warenkorb zurück (für Badge-Anzeige)
     * Öffentlicher Endpoint - funktioniert auch ohne Authentifizierung
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getCartCount(
            @RequestParam(required = false) Long storeId,
            @RequestParam String sessionId) {
        try {
            Cart cart = cartRepository.findBySessionId(sessionId).orElse(null);

            if (cart == null) {
                // Keine Session gefunden -> leerer Warenkorb
                return ResponseEntity.ok(Map.of("count", 0));
            }

            // Optional: Store-ID validieren wenn angegeben
            if (storeId != null && !cart.getStore().getId().equals(storeId)) {
                log.warn("StoreId mismatch: cart belongs to store {}, requested {}",
                    cart.getStore().getId(), storeId);
                return ResponseEntity.ok(Map.of("count", 0));
            }

            List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
            int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();

            return ResponseEntity.ok(Map.of("count", itemCount));

        } catch (Exception e) {
            log.error("Error getting cart count for session {}: {}", sessionId, e.getMessage());
            // Bei Fehler: Graceful degradation - gib 0 zurück statt Fehler
            return ResponseEntity.ok(Map.of("count", 0));
        }
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            Long storeId = Long.valueOf(request.get("storeId").toString());
            Long productId = Long.valueOf(request.get("productId").toString());
            Integer quantity = Integer.valueOf(request.getOrDefault("quantity", 1).toString());

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            // Get or create cart
            Cart cart = cartRepository.findBySessionId(sessionId)
                    .orElseGet(() -> {
                        Cart newCart = new Cart();
                        newCart.setSessionId(sessionId);
                        newCart.setStore(store);
                        newCart.setCreatedAt(LocalDateTime.now());
                        newCart.setUpdatedAt(LocalDateTime.now());
                        newCart.setExpiresAt(LocalDateTime.now().plusDays(7)); // Warenkorb läuft nach 7 Tagen ab
                        return cartRepository.save(newCart);
                    });

            // Für Produkte ohne Varianten: Erstelle eine "Default-Variante"
            ProductVariant defaultVariant = getOrCreateDefaultVariant(product);

            // Check if item already exists
            Optional<CartItem> existingItem = cartItemRepository
                    .findByCartIdAndVariantId(cart.getId(), defaultVariant.getId());

            CartItem cartItem;
            if (existingItem.isPresent()) {
                cartItem = existingItem.get();
                cartItem.setQuantity(cartItem.getQuantity() + quantity);
            } else {
                cartItem = new CartItem();
                cartItem.setCart(cart);
                cartItem.setVariant(defaultVariant);
                cartItem.setQuantity(quantity);
                cartItem.setPriceSnapshot(product.getBasePrice());
                cartItem.setCreatedAt(LocalDateTime.now());
            }
            cartItem.setUpdatedAt(LocalDateTime.now());

            cartItemRepository.save(cartItem);

            log.info("Added product {} to cart {}", productId, cart.getId());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Product added to cart"
            ));

        } catch (Exception e) {
            log.error("Error adding item to cart: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Erstellt oder lädt die Default-Variante für ein Produkt
     * Erstellt eine echte Variante in der Datenbank wenn keine existiert
     */
    private ProductVariant getOrCreateDefaultVariant(Product product) {
        // Prüfe ob bereits eine Default-Variante existiert
        // Wir nutzen die Produkt-ID als Basis für die SKU
        String defaultSku = "DEFAULT-" + product.getId();

        // Suche nach existierender Default-Variante für dieses Produkt
        List<ProductVariant> existingVariants = productVariantRepository.findAll();
        Optional<ProductVariant> existing = existingVariants.stream()
            .filter(v -> v.getProduct().getId().equals(product.getId()))
            .filter(v -> v.getSku().equals(defaultSku))
            .findFirst();

        if (existing.isPresent()) {
            log.debug("Found existing default variant for product {}", product.getId());
            return existing.get();
        }

        // Erstelle neue Default-Variante in der Datenbank
        log.info("Creating default variant for product {}", product.getId());
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku(defaultSku);
        variant.setPrice(product.getBasePrice());
        variant.setStockQuantity(999); // Hoher Lagerbestand für Default-Varianten

        // Speichere in Datenbank und gib zurück
        return productVariantRepository.save(variant);
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateCartItem(
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> request) {
        try {
            Integer quantity = Integer.valueOf(request.get("quantity").toString());

            CartItem item = cartItemRepository.findById(itemId)
                    .orElseThrow(() -> new RuntimeException("Cart item not found"));

            if (quantity <= 0) {
                cartItemRepository.delete(item);
                return ResponseEntity.ok(Map.of("success", true, "message", "Item removed"));
            }

            item.setQuantity(quantity);
            item.setUpdatedAt(LocalDateTime.now());
            cartItemRepository.save(item);

            return ResponseEntity.ok(Map.of("success", true, "item", item));
        } catch (Exception e) {
            log.error("Error updating cart item: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeCartItem(@PathVariable Long itemId) {
        cartItemRepository.deleteById(itemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(@RequestParam String sessionId) {
        try {
            Cart cart = cartRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("Cart not found"));
            cartItemRepository.deleteByCartId(cart.getId());
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
