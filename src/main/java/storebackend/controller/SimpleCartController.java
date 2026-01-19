package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.repository.*;
import storebackend.service.MinioService;
import storebackend.service.AuthService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Vereinfachter Warenkorb ohne Varianten
 * Arbeitet direkt mit Produkten
 * FIXED: Jetzt mit JWT-basierter User-Unterscheidung
 */
@RestController
@RequestMapping("/api/public/simple-cart")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@RequiredArgsConstructor
@Slf4j
public class SimpleCartController {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductMediaRepository productMediaRepository;
    private final MinioService minioService;
    private final AuthService authService;
    private final UserRepository userRepository;

    /**
     * FIXED: Extrahiert User-ID aus JWT Token (falls vorhanden)
     * Gibt null zurück für Guest-Benutzer
     */
    private Long extractUserIdFromRequest(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                Long userId = authService.getUserIdFromToken(token);
                log.info("🔐 Authenticated user detected: {}", userId);
                return userId;
            } catch (Exception e) {
                log.warn("⚠️ Invalid JWT token: {}", e.getMessage());
                return null;
            }
        }
        log.info("👤 Guest user detected (no token)");
        return null;
    }

    /**
     * FIXED: Findet oder erstellt Cart basierend auf User-ID oder Session-ID
     * Für angemeldete User: Nur userId + storeId
     * Für Gäste: sessionId + storeId (echte Browser-Session)
     */
    private Cart findOrCreateCart(Long userId, Long storeId, String sessionId) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        if (userId != null) {
            // USER CART: Nutze optimierte Query
            log.info("🔍 Searching for user cart (userId: {}, storeId: {})", userId, storeId);
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Nutze die optimierte Repository-Methode
            List<Cart> userCarts = cartRepository.findByUserIdAndStoreIdAndNotExpired(
                userId, storeId, LocalDateTime.now()
            );

            if (!userCarts.isEmpty()) {
                Cart cart = userCarts.get(0);
                int itemCount = cartItemRepository.findByCartId(cart.getId()).size();
                log.info("✅ Found existing user cart: {} (userId: {}, storeId: {}, has {} items)",
                    cart.getId(), userId, storeId, itemCount);
                return cart;
            }

            // Erstelle neuen User-Cart OHNE sessionId
            log.info("➕ Creating new user cart for userId: {}, storeId: {}", userId, storeId);
            Cart cart = new Cart();
            cart.setUser(user);
            cart.setSessionId(null); // KEINE sessionId für angemeldete User!
            cart.setStore(store);
            cart.setCreatedAt(LocalDateTime.now());
            cart.setUpdatedAt(LocalDateTime.now());
            cart.setExpiresAt(LocalDateTime.now().plusDays(30)); // User-Carts länger gültig
            Cart savedCart = cartRepository.save(cart);
            log.info("✅ Created new user cart with ID: {}", savedCart.getId());
            return savedCart;

        } else {
            // GUEST CART: Nur für nicht-angemeldete User
            if (sessionId == null || sessionId.isEmpty()) {
                throw new RuntimeException("SessionId required for guest checkout");
            }

            log.info("🔍 Searching for guest cart (sessionId: {}, storeId: {})", sessionId, storeId);

            // Nutze die optimierte Repository-Methode
            List<Cart> guestCarts = cartRepository.findBySessionIdAndStoreIdAndNotExpired(
                sessionId, storeId, LocalDateTime.now()
            );

            if (!guestCarts.isEmpty()) {
                Cart cart = guestCarts.get(0);
                int itemCount = cartItemRepository.findByCartId(cart.getId()).size();
                log.info("✅ Found existing guest cart: {} (has {} items)", cart.getId(), itemCount);
                return cart;
            }

            // Erstelle neuen Guest-Cart
            log.info("➕ Creating new guest cart for sessionId: {}, storeId: {}", sessionId, storeId);
            Cart cart = new Cart();
            cart.setSessionId(sessionId);
            cart.setStore(store);
            cart.setCreatedAt(LocalDateTime.now());
            cart.setUpdatedAt(LocalDateTime.now());
            cart.setExpiresAt(LocalDateTime.now().plusDays(7)); // Guest-Carts kürzer gültig
            Cart savedCart = cartRepository.save(cart);
            log.info("✅ Created new guest cart with ID: {}", savedCart.getId());
            return savedCart;
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCart(
            @RequestParam Long storeId,
            @RequestParam(required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = extractUserIdFromRequest(authHeader);
            log.info("🔍 Loading cart for storeId: {}, userId: {}, sessionId: {}", storeId, userId, sessionId);

            Cart cart = findOrCreateCart(userId, storeId, sessionId);

            log.info("📦 Loading items for cart ID: {}", cart.getId());
            List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
            log.info("📦 Found {} items in cart", items.size());

            // Konvertiere CartItems zu DTOs
            List<Map<String, Object>> itemDTOs = items.stream()
                    .map(item -> {
                        Map<String, Object> dto = new java.util.HashMap<>();
                        dto.put("id", item.getId());
                        dto.put("quantity", item.getQuantity());
                        dto.put("priceSnapshot", item.getPriceSnapshot());

                        Product product = item.getVariant().getProduct();
                        dto.put("productId", product.getId());
                        dto.put("productTitle", product.getTitle());
                        dto.put("productDescription", product.getDescription());
                        dto.put("variantId", item.getVariant().getId());
                        dto.put("variantSku", item.getVariant().getSku());

                        // Füge Produktbild hinzu
                        try {
                            List<ProductMedia> media = productMediaRepository.findByProductIdOrderBySortOrderAsc(product.getId());
                            if (!media.isEmpty()) {
                                ProductMedia primaryMedia = media.stream()
                                    .filter(pm -> pm != null && pm.getIsPrimary() != null && pm.getIsPrimary())
                                    .findFirst()
                                    .orElse(media.get(0));

                                if (primaryMedia != null && primaryMedia.getMedia() != null) {
                                    String imageUrl = minioService.getPresignedUrl(
                                        primaryMedia.getMedia().getMinioObjectName(), 60
                                    );
                                    dto.put("imageUrl", imageUrl);
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Could not load image for product {}: {}", product.getId(), e.getMessage());
                            dto.put("imageUrl", null);
                        }

                        return dto;
                    })
                    .collect(java.util.stream.Collectors.toList());

            BigDecimal subtotal = items.stream()
                    .map(item -> item.getPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();

            log.info("✅ Returning cart with {} items, subtotal: {}", itemCount, subtotal);

            return ResponseEntity.ok(Map.of(
                "items", itemDTOs,
                "itemCount", itemCount,
                "subtotal", subtotal,
                "cartId", cart.getId(),
                "storeId", storeId,
                "sessionId", cart.getSessionId() != null ? cart.getSessionId() : ""
            ));
        } catch (Exception e) {
            log.error("❌ Error loading cart for storeId {}: {}", storeId, e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "items", List.of(),
                "itemCount", 0,
                "subtotal", 0,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * FIXED: Gibt die Anzahl der Items im Warenkorb zurück (User-spezifisch)
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getCartCount(
            @RequestParam Long storeId,
            @RequestParam(required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = extractUserIdFromRequest(authHeader);

            // Für angemeldete User: sessionId optional
            if (userId != null) {
                Cart cart = findOrCreateCart(userId, storeId, null);
                List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
                int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();
                log.info("✅ Cart count for userId: {}, storeId: {} = {}", userId, storeId, itemCount);
                return ResponseEntity.ok(Map.of("count", itemCount));
            }

            // Für Gäste: sessionId erforderlich
            if (sessionId == null || sessionId.isEmpty()) {
                log.warn("⚠️ Guest user without sessionId");
                return ResponseEntity.ok(Map.of("count", 0));
            }

            Cart cart = findOrCreateCart(null, storeId, sessionId);
            List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
            int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();
            log.info("✅ Cart count for guest (sessionId: {}), storeId: {} = {}", sessionId, storeId, itemCount);
            return ResponseEntity.ok(Map.of("count", itemCount));
        } catch (Exception e) {
            log.error("Error getting cart count for storeId {}: {}", storeId, e.getMessage());
            return ResponseEntity.ok(Map.of("count", 0));
        }
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = extractUserIdFromRequest(authHeader);
            Long storeId = Long.valueOf(request.get("storeId").toString());
            Long productId = Long.valueOf(request.get("productId").toString());
            Integer quantity = Integer.valueOf(request.getOrDefault("quantity", 1).toString());
            String sessionId = (String) request.get("sessionId");

            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            Cart cart = findOrCreateCart(userId, storeId, sessionId);

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

            log.info("✅ Added product {} to cart {} (userId: {}, storeId: {})", productId, cart.getId(), userId, storeId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Product added to cart",
                "cartId", cart.getId(),
                "sessionId", cart.getSessionId() != null ? cart.getSessionId() : ""
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
    public ResponseEntity<Void> clearCart(@RequestParam Long storeId) {
        try {
            List<Cart> storeCarts = cartRepository.findAll().stream()
                .filter(c -> c.getStore() != null && c.getStore().getId().equals(storeId))
                .collect(java.util.stream.Collectors.toList());

            if (!storeCarts.isEmpty()) {
                Cart cart = storeCarts.get(0);
                cartItemRepository.deleteByCartId(cart.getId());
            }
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
