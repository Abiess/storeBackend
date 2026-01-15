package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.CartItem;
import storebackend.entity.Order;
import storebackend.repository.CartItemRepository;
import storebackend.repository.CartRepository;
import storebackend.service.OrderService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/orders")
@RequiredArgsConstructor
@Slf4j
public class PublicOrderController {
    private final OrderService orderService;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final storebackend.repository.UserRepository userRepository;
    private final storebackend.security.JwtUtil jwtUtil; // FIXED: JwtUtil für Token-Parsing

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = true) String authHeader) {
        try {
            // Extrahiere UserId aus JWT Token
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Authentication required for checkout. Please login."
                ));
            }

            String token = authHeader.substring(7);
            Long userId;
            String email;

            try {
                // FIXED: Nutze JwtUtil statt manuelles Parsing
                userId = jwtUtil.extractUserId(token);
                email = jwtUtil.extractEmail(token);

                // FIXED: Validiere Token
                if (!jwtUtil.validateToken(token, email)) {
                    log.error("Token validation failed for email: {}", email);
                    return ResponseEntity.status(401).body(Map.of(
                        "error", "Invalid or expired token. Please login again."
                    ));
                }

                log.info("✅ Token validated successfully for userId: {}, email: {}", userId, email);
            } catch (Exception e) {
                log.error("Invalid token during checkout: {}", e.getMessage());
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Invalid or expired token. Please login again."
                ));
            }

            Long storeId = Long.valueOf(request.get("storeId").toString());
            String customerEmail = (String) request.get("customerEmail");

            log.info("🛍️ Checkout - userId: {}, storeId: {}, email: {}", userId, storeId, customerEmail);

            // FIXED: Suche zuerst nach userId, dann nach Guest-Cart für diesen Store
            var cartOptional = cartRepository.findByUserId(userId);

            if (cartOptional.isEmpty()) {
                // Kein User-spezifischer Cart gefunden, suche Guest-Cart
                log.info("🔍 Kein User-Cart gefunden, suche Guest-Cart für Store {}", storeId);

                // Suche nach neuesten Guest-Cart für diesen Store
                String guestSessionId = "store-" + storeId + "-cart";
                cartOptional = cartRepository.findBySessionId(guestSessionId);

                if (cartOptional.isEmpty()) {
                    // Fallback: Suche ALLE Carts für diesen Store (sortiert nach Datum)
                    List<storebackend.entity.Cart> storeCarts = cartRepository.findAll().stream()
                        .filter(c -> c.getStore() != null && c.getStore().getId().equals(storeId))
                        .filter(c -> c.getExpiresAt().isAfter(java.time.LocalDateTime.now()))
                        .sorted((c1, c2) -> c2.getUpdatedAt().compareTo(c1.getUpdatedAt()))
                        .toList();

                    if (!storeCarts.isEmpty()) {
                        cartOptional = java.util.Optional.of(storeCarts.get(0));
                        log.info("✅ Guest-Cart gefunden für Store {}", storeId);
                    }
                }
            }

            var cart = cartOptional
                    .orElseThrow(() -> new RuntimeException("Cart not found. Please add items to cart first."));

            // Verify cart belongs to the correct store
            if (!cart.getStore().getId().equals(storeId)) {
                throw new RuntimeException("Cart does not belong to store " + storeId);
            }

            // Verify cart is not empty
            List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
            if (items.isEmpty()) {
                throw new RuntimeException("Cart is empty. Please add items before checkout.");
            }

            // FIXED: Verknüpfe Guest-Cart mit dem eingeloggten User
            storebackend.entity.User customer = null;
            if (cart.getUser() == null) {
                log.info("🔗 Verknüpfe Guest-Cart mit User {}", userId);
                customer = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
                cart.setUser(customer);
                cartRepository.save(cart);
            } else {
                customer = cart.getUser();
            }

            // Extract addresses
            Map<String, String> shippingAddress = (Map<String, String>) request.get("shippingAddress");
            Map<String, String> billingAddress = (Map<String, String>) request.get("billingAddress");
            String notes = (String) request.get("notes");

            // Create order
            Order order = orderService.createOrderFromCart(
                cart.getId(),
                customerEmail,
                shippingAddress.get("firstName"),
                shippingAddress.get("lastName"),
                shippingAddress.get("address1"),
                shippingAddress.get("address2"),
                shippingAddress.get("city"),
                shippingAddress.get("postalCode"),
                shippingAddress.get("country"),
                shippingAddress.get("phone"),
                billingAddress.get("firstName"),
                billingAddress.get("lastName"),
                billingAddress.get("address1"),
                billingAddress.get("address2"),
                billingAddress.get("city"),
                billingAddress.get("postalCode"),
                billingAddress.get("country"),
                notes,
                customer  // Pass the actual customer
            );

            log.info("✅ Order created successfully: {} for userId: {}", order.getOrderNumber(), userId);

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("orderNumber", order.getOrderNumber());
            response.put("status", order.getStatus());
            response.put("total", order.getTotalAmount());
            response.put("customerEmail", customerEmail);
            response.put("message", "Order created successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Checkout error: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{orderNumber}")
    public ResponseEntity<Order> getOrderByNumber(
            @PathVariable String orderNumber,
            @RequestParam String email) {

        try {
            Order order = orderService.getOrderByNumber(orderNumber);

            // Verify email access - allow if:
            // 1. Order has no customer (guest order)
            // 2. Customer email matches the provided email
            if (order.getCustomer() != null) {
                String customerEmail = order.getCustomer().getEmail();
                if (customerEmail != null && !customerEmail.equalsIgnoreCase(email)) {
                    log.warn("❌ Email mismatch for order {}: expected {}, got {}",
                        orderNumber, customerEmail, email);
                    return ResponseEntity.status(403).build();
                }
            } else {
                // Guest order - allow access (no customer associated)
                log.info("✅ Allowing access to guest order {}", orderNumber);
            }

            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            log.error("❌ Order not found: {}", orderNumber);
            return ResponseEntity.notFound().build();
        }
    }
}
