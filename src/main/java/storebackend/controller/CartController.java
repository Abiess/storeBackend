package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.enums.PriceMode;
import storebackend.enums.TaxCategory;
import storebackend.repository.*;
import storebackend.service.CartService;
import storebackend.service.ProductService;
import storebackend.service.ProductTierPriceService;
import storebackend.service.TaxCalculationService;
import storebackend.security.JwtUtil;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
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
    private final ProductService productService; // ✅ Nutze zentrale Bildauflösung
    private final JwtUtil jwtUtil;
    private final ProductTierPriceService tierPriceService;
    private final TaxCalculationService taxCalculationService;
    private final ProductRepository productRepository;

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
    public ResponseEntity<?> addItemToCart(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Object storeIdRaw = request.get("storeId");
        Object variantIdRaw = request.get("variantId");
        Object productIdRaw = request.get("productId");
        Object quantityRaw = request.get("quantity");

        if (storeIdRaw == null) return ResponseEntity.badRequest().body(Map.of("error", "storeId is required"));
        if (quantityRaw == null) return ResponseEntity.badRequest().body(Map.of("error", "quantity is required"));
        if (variantIdRaw == null && productIdRaw == null)
            return ResponseEntity.badRequest().body(Map.of("error", "variantId or productId is required"));

        Long storeId = Long.valueOf(storeIdRaw.toString());
        Long variantId = variantIdRaw != null ? Long.valueOf(variantIdRaw.toString()) : null;
        Long productId = productIdRaw != null ? Long.valueOf(productIdRaw.toString()) : null;
        Integer quantity = Integer.valueOf(quantityRaw.toString());

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

        CartItem item = cartService.addItemToCart(cart.getId(), variantId, productId, quantity);
        return ResponseEntity.ok(item);
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateCartItem(
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> request) {

        Object quantityRaw = request.get("quantity");
        if (quantityRaw == null) return ResponseEntity.badRequest().body(Map.of("error", "quantity is required"));
        Integer quantity = Integer.valueOf(quantityRaw.toString());
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

    // Package-private für Tests
    Map<String, Object> buildCartResponse(Cart cart, List<CartItem> items) {
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
                    
                    // Fallback: Wenn Variante kein Bild hat, verwende Produkt-Bild (zentrale Methode)
                    if (imageUrl == null || imageUrl.isEmpty()) {
                        imageUrl = productService.resolveProductImageUrl(product);
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
                imageUrl = productService.resolveProductImageUrl(product); // ✅ Zentrale Methode

                Map<String, Object> productDto = new HashMap<>();
                productDto.put("id", product.getId());
                productDto.put("name", product.getTitle());
                productDto.put("description", product.getDescription());
                productDto.put("price", product.getBasePrice());
                productDto.put("imageUrl", imageUrl);

                dto.put("product", productDto);
            }

            // FIXED: Setze imageUrl, productTitle, variantSku auf oberster Ebene (für Frontend!)
            dto.put("imageUrl", imageUrl); // null erlaubt - Frontend zeigt Platzhalter
            dto.put("productTitle", productTitle != null ? productTitle : "Unknown Product");
            dto.put("variantSku", variantSku != null ? variantSku : "");

            // ✅ STAFFELPREIS-METADATEN FÜR FRONTEND (immer setzen für konsistente API)
            Product product = item.getVariant() != null && item.getVariant().getProduct() != null
                ? item.getVariant().getProduct()
                : item.getProduct();
            
            if (product != null) {
                BigDecimal basePrice = item.getVariant() != null && item.getVariant().getPrice() != null
                    ? item.getVariant().getPrice()
                    : product.getBasePrice();
                
                storebackend.dto.TierPriceCalculationResult tierCalc = tierPriceService.calculateWithDetails(
                    product, basePrice, item.getQuantity());
                
                dto.put("baseUnitPrice", tierCalc.getBaseUnitPrice());
                dto.put("effectiveUnitPrice", tierCalc.getEffectiveUnitPrice());
                dto.put("tierPriceApplied", tierCalc.getTierPriceApplied());
                dto.put("appliedTierMinimumQuantity", tierCalc.getAppliedTierMinimumQuantity());
            } else {
                // Product null → Konsistente API-Antwort mit fallback-Werten
                dto.put("baseUnitPrice", item.getPriceSnapshot());
                dto.put("effectiveUnitPrice", item.getPriceSnapshot());
                dto.put("tierPriceApplied", false);
                dto.put("appliedTierMinimumQuantity", null);
            }

            return dto;
        }).toList();

        response.put("items", itemDtos);
        response.put("itemCount", items.stream().mapToInt(CartItem::getQuantity).sum());
        
        // ─── VOLLSTÄNDIGE STEUERBERECHNUNG (wie in OrderService) ─────────────────────
        Store store = cart.getStore();
        PriceMode priceMode = store.getPriceMode() != null ? store.getPriceMode() : PriceMode.GROSS;
        boolean vatEnabled = Boolean.TRUE.equals(store.getVatEnabled());
        
        BigDecimal subtotalNet = BigDecimal.ZERO;
        BigDecimal subtotalTax = BigDecimal.ZERO;
        BigDecimal subtotalGross = BigDecimal.ZERO;
        
        // Tax breakdown per rate (für gemischte Steuersätze)
        Map<BigDecimal, TaxBreakdownItem> taxBreakdownMap = new HashMap<>();
        
        for (CartItem item : items) {
            // ✅ Produkt FRISCH laden für aktuelle Tax-Daten (wie in OrderService)
            Product product = item.getVariant() != null && item.getVariant().getProduct() != null
                ? item.getVariant().getProduct()
                : item.getProduct();
                
            if (product == null) continue;
            
            Product freshProduct = productRepository.findById(product.getId())
                .orElse(product); // Fallback zu lazy-loaded
            
            // Basispreis + Staffelpreis
            BigDecimal basePrice = item.getVariant() != null && item.getVariant().getPrice() != null
                ? item.getVariant().getPrice()
                : freshProduct.getBasePrice();
            
            storebackend.dto.TierPriceCalculationResult tierCalc = tierPriceService.calculateWithDetails(
                freshProduct, basePrice, item.getQuantity());
            
            BigDecimal unitPrice = tierCalc.getEffectiveUnitPrice();
            
            // Tax-Daten vom frischen Produkt
            TaxCategory taxCategory = freshProduct.getTaxCategory() != null
                ? freshProduct.getTaxCategory()
                : TaxCategory.STANDARD;
            
            BigDecimal taxRate = freshProduct.getTaxRate() != null
                ? freshProduct.getTaxRate()
                : (store.getDefaultTaxRate() != null 
                    ? store.getDefaultTaxRate() 
                    : new BigDecimal("19.00"));
            
            if (!vatEnabled) {
                taxCategory = TaxCategory.EXEMPT;
                taxRate = BigDecimal.ZERO;
            }
            
            // Berechne Steueraufteilung
            TaxCalculationService.TaxBreakdown unitBreakdown = 
                taxCalculationService.calculatePriceBreakdown(unitPrice, taxRate, priceMode);
            
            BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
            BigDecimal lineNet = unitBreakdown.net().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTax = unitBreakdown.tax().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineGross = unitBreakdown.gross().multiply(quantity).setScale(2, RoundingMode.HALF_UP);
            
            subtotalNet = subtotalNet.add(lineNet);
            subtotalTax = subtotalTax.add(lineTax);
            subtotalGross = subtotalGross.add(lineGross);
            
            // Akkumuliere Tax breakdown per rate
            taxBreakdownMap.computeIfAbsent(taxRate, rate -> 
                new TaxBreakdownItem(rate, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO))
                .add(lineNet, lineTax, lineGross);
        }
        
        // Legacy subtotal (für Abwärtskompatibilität - entspricht subtotalGross)
        response.put("subtotal", subtotalGross);
        
        // ✅ Neue Felder für korrekte Steueranzeige
        response.put("subtotalNet", subtotalNet);
        response.put("subtotalTax", subtotalTax);
        response.put("subtotalGross", subtotalGross);
        response.put("priceMode", priceMode.name());
        response.put("vatEnabled", vatEnabled);
        
        // Tax breakdown (sortiert nach Rate)
        List<Map<String, Object>> taxBreakdownList = taxBreakdownMap.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> {
                Map<String, Object> item = new HashMap<>();
                item.put("taxRate", entry.getKey());
                item.put("netAmount", entry.getValue().net);
                item.put("taxAmount", entry.getValue().tax);
                item.put("grossAmount", entry.getValue().gross);
                return item;
            })
            .toList();
        
        response.put("taxBreakdown", taxBreakdownList);
        
        response.put("expiresAt", cart.getExpiresAt());
        return response;
    }
    
    // Helper class für Tax breakdown accumulation
    private static class TaxBreakdownItem {
        BigDecimal rate;
        BigDecimal net;
        BigDecimal tax;
        BigDecimal gross;
        
        TaxBreakdownItem(BigDecimal rate, BigDecimal net, BigDecimal tax, BigDecimal gross) {
            this.rate = rate;
            this.net = net;
            this.tax = tax;
            this.gross = gross;
        }
        
        void add(BigDecimal addNet, BigDecimal addTax, BigDecimal addGross) {
            this.net = this.net.add(addNet);
            this.tax = this.tax.add(addTax);
            this.gross = this.gross.add(addGross);
        }
    }

    /**
     * Extrahiert UserId aus JWT Token via JwtUtil (liest userId-Claim, nicht sub/email)
     */
    private Long extractUserIdFromToken(String token) {
        try {
            Long userId = jwtUtil.extractUserId(token);
            if (userId == null) {
                // Fallback: userId über Email + UserRepository ermitteln
                String email = jwtUtil.extractEmail(token);
                return userRepository.findByEmail(email)
                        .map(u -> u.getId())
                        .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
            }
            return userId;
        } catch (Exception e) {
            throw new RuntimeException("Could not extract userId from token: " + e.getMessage());
        }
    }
}
