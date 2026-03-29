package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.repository.*;
import storebackend.service.CartService;
import storebackend.service.MinioService;

import java.math.BigDecimal;
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
    private final MinioService minioService;
    private final ProductMediaRepository productMediaRepository;

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

    /**
     * PUBLIC: Get cart item count (für Header-Badge)
     * GET /api/public/cart/count?storeId=5&sessionId=guest-xyz
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getCartCount(
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            Cart cart;

            // Prüfe ob User eingeloggt ist
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                Long userId = extractUserIdFromToken(token);
                cart = cartService.getCartByUser(userId);
            } else if (sessionId != null) {
                cart = cartService.getCartBySessionId(sessionId);
            } else {
                // Kein Cart vorhanden - return 0
                return ResponseEntity.ok(Map.of("count", 0, "itemCount", 0));
            }

            List<CartItem> items = cartService.getCartItems(cart.getId());
            int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();

            return ResponseEntity.ok(Map.of(
                "count", itemCount,
                "itemCount", itemCount,
                "cartId", cart.getId()
            ));

        } catch (RuntimeException e) {
            log.debug("Cart not found for count request: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("count", 0, "itemCount", 0));
        }
    }

    private Map<String, Object> buildCartResponse(Cart cart, List<CartItem> items) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", cart.getId());
        response.put("sessionId", cart.getSessionId());
        response.put("storeId", cart.getStore().getId());

        // Konvertiere CartItems in DTOs mit allen notwendigen Feldern
        List<Map<String, Object>> itemDtos = items.stream().map(item -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", item.getId());
            dto.put("quantity", item.getQuantity());
            dto.put("price", item.getPriceSnapshot());

            // FIXED: Extrahiere Bild-URL DIREKT auf Item-Ebene (für Frontend!)
            String imageUrl = null;
            String productTitle = null;
            String variantSku = null;

            // Füge Variant-Details hinzu (wenn vorhanden)
            if (item.getVariant() != null) {
                dto.put("variantId", item.getVariant().getId());
                variantSku = item.getVariant().getSku();

                // FIXED: Hol Bild-URL - Priorität: Varianten-Bild > Produkt-Bild
                imageUrl = item.getVariant().getImageUrl();

                Map<String, Object> variantDto = new HashMap<>();
                variantDto.put("id", item.getVariant().getId());
                variantDto.put("sku", item.getVariant().getSku());
                variantDto.put("price", item.getVariant().getPrice());
                variantDto.put("stock", item.getVariant().getStockQuantity());

                // Füge Product-Details hinzu (über Variant)
                if (item.getVariant().getProduct() != null) {
                    Product product = item.getVariant().getProduct();
                    productTitle = product.getTitle();
                    
                    Map<String, Object> productDto = new HashMap<>();
                    productDto.put("id", product.getId());
                    productDto.put("name", product.getTitle());
                    productDto.put("description", product.getDescription());
                    
                    // Fallback: Wenn Variante kein Bild hat, verwende Produkt-Bild
                    if (imageUrl == null || imageUrl.isEmpty()) {
                        imageUrl = getProductImageUrl(product);
                    }
                    productDto.put("imageUrl", imageUrl);
                    
                    variantDto.put("product", productDto);
                }

                dto.put("variant", variantDto);
            }
            // Behandle Items ohne Variante (nur Product)
            else if (item.getProduct() != null) {
                dto.put("variantId", null);
                dto.put("productId", item.getProduct().getId());

                Product product = item.getProduct();
                productTitle = product.getTitle();
                imageUrl = getProductImageUrl(product);

                Map<String, Object> productDto = new HashMap<>();
                productDto.put("id", product.getId());
                productDto.put("name", product.getTitle());
                productDto.put("description", product.getDescription());
                productDto.put("price", product.getBasePrice());
                productDto.put("imageUrl", imageUrl);

                dto.put("product", productDto);
            }

            // FIXED: Setze imageUrl, productTitle, variantSku auf oberster Ebene (für Frontend!)
            dto.put("imageUrl", imageUrl != null ? imageUrl : "/assets/placeholder-product.png");
            dto.put("productTitle", productTitle != null ? productTitle : "Unknown Product");
            dto.put("variantSku", variantSku != null ? variantSku : "");

            return dto;
        }).toList();

        response.put("items", itemDtos);
        response.put("itemCount", items.stream().mapToInt(CartItem::getQuantity).sum());
        response.put("subtotal", items.stream()
                .map(item -> item.getPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add));
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

    /**
     * Holt die Bild-URL eines Produkts über ProductMedia
     * FIXED: Mit mehreren Fallback-Optionen für Robustheit
     */
    private String getProductImageUrl(Product product) {
        // Fallback 1: Versuche ProductMedia + MinIO
        try {
            List<ProductMedia> mediaList = productMediaRepository.findByProductIdOrderBySortOrderAsc(product.getId());
            
            if (!mediaList.isEmpty()) {
                // Suche Primary Image
                ProductMedia primaryMedia = mediaList.stream()
                    .filter(ProductMedia::getIsPrimary)
                    .findFirst()
                    .orElse(mediaList.get(0));
                
                // Generiere presigned URL für MinIO
                String url = minioService.getPresignedUrl(primaryMedia.getMedia().getMinioObjectName(), 60);
                if (url != null && !url.isEmpty()) {
                    return url;
                }
            }
        } catch (Exception e) {
            log.debug("ProductMedia/MinIO nicht verfügbar für Produkt {}: {}", product.getId(), e.getMessage());
        }
        
        // Fallback 2: Verwende placeholder
        return "/assets/placeholder-product.png";
    }
}
