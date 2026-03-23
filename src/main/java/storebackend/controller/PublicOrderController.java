package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.OrderDetailsDTO;
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
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = null;
            String email = null;
            boolean isGuest = false;

            // FIXED: Token ist jetzt optional für Guest-Checkout
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    // Authentifizierter User
                    userId = jwtUtil.extractUserId(token);
                    email = jwtUtil.extractEmail(token);

                    if (!jwtUtil.validateToken(token, email)) {
                        log.error("Token validation failed for email: {}", email);
                        return ResponseEntity.status(401).body(Map.of(
                            "error", "Invalid or expired token. Please login again."
                        ));
                    }

                    log.info("✅ Authenticated checkout - userId: {}, email: {}", userId, email);
                } catch (Exception e) {
                    log.error("Invalid token during checkout: {}", e.getMessage());
                    return ResponseEntity.status(401).body(Map.of(
                        "error", "Invalid or expired token. Please login again."
                    ));
                }
            } else {
                // Guest-Checkout
                isGuest = true;
                log.info("👤 Guest checkout detected");
            }

            Long storeId = Long.valueOf(request.get("storeId").toString());
            String customerEmail = (String) request.get("customerEmail");

            // Zahlungsmethode extrahieren
            String paymentMethodStr = (String) request.get("paymentMethod");
            storebackend.enums.PaymentMethod paymentMethod = paymentMethodStr != null
                ? storebackend.enums.PaymentMethod.valueOf(paymentMethodStr)
                : null;

            // Phone Verification ID für Cash on Delivery
            Long phoneVerificationId = null;
            Object phoneVerifRaw = request.get("phoneVerificationId");
            if (phoneVerifRaw != null && !"null".equals(phoneVerifRaw.toString().trim())) {
                try {
                    phoneVerificationId = Long.valueOf(phoneVerifRaw.toString());
                } catch (NumberFormatException e) {
                    log.warn("Invalid phoneVerificationId value: {}", phoneVerifRaw);
                }
            }

            // Validiere Phone Verification für Cash on Delivery
            if (paymentMethod == storebackend.enums.PaymentMethod.CASH_ON_DELIVERY) {
                if (phoneVerificationId == null) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "Telefonnummer-Verifizierung ist erforderlich für Nachnahme",
                        "requiresPhoneVerification", true
                    ));
                }

                // Prüfe ob Verifizierung gültig ist (sollte im Service gemacht werden)
                log.info("📱 Cash on Delivery order with phone verification: {}", phoneVerificationId);
            }

            log.info("🛍️ Checkout - Mode: {}, storeId: {}, email: {}, payment: {}",
                isGuest ? "GUEST" : "AUTHENTICATED", storeId, customerEmail, paymentMethod);

            // FIXED: Cart-Suche je nach Checkout-Typ
            var cartOptional = java.util.Optional.<storebackend.entity.Cart>empty();

            if (isGuest) {
                // Guest-Checkout: Suche Cart anhand sessionId
                String sessionId = (String) request.get("sessionId");
                if (sessionId == null || sessionId.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "SessionId is required for guest checkout"
                    ));
                }

                log.info("🔍 Suche Guest-Cart mit sessionId: {}", sessionId);
                cartOptional = cartRepository.findBySessionId(sessionId);

                if (cartOptional.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "Cart not found. Please add items to cart first."
                    ));
                }
            } else {
                // Authenticated Checkout: Suche Cart anhand userId
                log.info("🔍 Suche User-Cart für userId: {}", userId);
                cartOptional = cartRepository.findByUserId(userId);

                if (cartOptional.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "Cart not found. Please add items to cart first."
                    ));
                }
            }

            var cart = cartOptional.get();

            // Verify cart belongs to the correct store
            if (!cart.getStore().getId().equals(storeId)) {
                throw new RuntimeException("Cart does not belong to store " + storeId);
            }

            // Verify cart is not empty
            List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
            if (items.isEmpty()) {
                throw new RuntimeException("Cart is empty. Please add items before checkout.");
            }

            // FIXED: Customer-Handling für Guest vs. Authenticated
            storebackend.entity.User customer = null;
            if (!isGuest && userId != null) {
                // Authenticated: Lade User und verknüpfe mit Cart
                customer = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

                if (cart.getUser() == null) {
                    log.info("🔗 Verknüpfe Guest-Cart mit User {}", userId);
                    cart.setUser(customer);
                    cartRepository.save(cart);
                }
            } else {
                // Guest: customer bleibt null - Order wird ohne User erstellt
                log.info("👤 Guest-Order wird erstellt (kein User-Account)");
            }

            // Extract addresses
            Map<String, String> shippingAddress = (Map<String, String>) request.get("shippingAddress");
            Map<String, String> billingAddress = (Map<String, String>) request.get("billingAddress");
            String notes = (String) request.get("notes");

            // Extract delivery information (NEW)
            storebackend.enums.DeliveryType deliveryType = null;
            storebackend.enums.DeliveryMode deliveryMode = null;

            if (request.containsKey("deliveryType")) {
                String deliveryTypeStr = (String) request.get("deliveryType");
                deliveryType = storebackend.enums.DeliveryType.valueOf(deliveryTypeStr);
            }

            if (request.containsKey("deliveryMode")) {
                String deliveryModeStr = (String) request.get("deliveryMode");
                deliveryMode = deliveryModeStr != null ? storebackend.enums.DeliveryMode.valueOf(deliveryModeStr) : null;
            }

            // Strict validation: deliveryType is required
            if (deliveryType == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Delivery type is required"
                ));
            }

            // Strict validation: deliveryMode is required for DELIVERY type
            if (deliveryType == storebackend.enums.DeliveryType.DELIVERY && deliveryMode == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Delivery mode is required when delivery type is DELIVERY"
                ));
            }

            // Strict validation: deliveryMode must be null for PICKUP type
            if (deliveryType == storebackend.enums.DeliveryType.PICKUP && deliveryMode != null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Delivery mode must be null for PICKUP"
                ));
            }

            log.info("📦 Delivery: type={}, mode={}", deliveryType, deliveryMode);

            // Helper method to safely get string from map
            java.util.function.Function<String, String> getFromShipping = 
                key -> shippingAddress.getOrDefault(key, "");
            java.util.function.Function<String, String> getFromBilling = 
                key -> billingAddress.getOrDefault(key, "");

            // Create order mit PaymentMethod, PhoneVerificationId und Delivery Information
            Order order = orderService.createOrderFromCart(
                cart.getId(),
                customerEmail,
                getFromShipping.apply("firstName"),
                getFromShipping.apply("lastName"),
                getFromShipping.apply("address1"),
                getFromShipping.apply("address2"),
                getFromShipping.apply("city"),
                getFromShipping.apply("postalCode"),
                getFromShipping.apply("country"),
                getFromShipping.apply("phone"),
                getFromBilling.apply("firstName"),
                getFromBilling.apply("lastName"),
                getFromBilling.apply("address1"),
                getFromBilling.apply("address2"),
                getFromBilling.apply("city"),
                getFromBilling.apply("postalCode"),
                getFromBilling.apply("country"),
                notes,
                customer,
                paymentMethod,
                phoneVerificationId,
                deliveryType,
                deliveryMode
            );

            log.info("✅ Order created successfully: {} (Mode: {}, Payment: {})",
                order.getOrderNumber(), isGuest ? "GUEST" : "AUTHENTICATED", paymentMethod);

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("orderNumber", order.getOrderNumber());
            response.put("status", order.getStatus());
            response.put("total", order.getTotalAmount());
            response.put("customerEmail", customerEmail);
            response.put("paymentMethod", paymentMethod);
            response.put("phoneVerified", order.getPhoneVerified());
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
    public ResponseEntity<?> getOrderByNumber(
            @PathVariable String orderNumber,
            @RequestParam String email) {

        try {
            log.info("🔍 Abrufen der Bestellung: {} mit E-Mail: {}", orderNumber, email);

            OrderDetailsDTO orderDetails = orderService.getOrderDetailsByNumber(orderNumber);

            // Verify email access - allow if:
            // 1. Order has no customer (guest order)
            // 2. Customer email matches the provided email
            if (orderDetails.getCustomer() != null) {
                String customerEmail = orderDetails.getCustomer().getEmail();
                if (customerEmail != null && !customerEmail.equalsIgnoreCase(email)) {
                    log.warn("❌ Email mismatch for order {}: expected {}, got {}",
                        orderNumber, customerEmail, email);
                    return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
                }
            } else {
                // Guest order - allow access (no customer associated)
                log.info("✅ Allowing access to guest order {}", orderNumber);
            }

            log.info("✅ Bestellung erfolgreich abgerufen: {}", orderNumber);
            return ResponseEntity.ok(orderDetails);
        } catch (RuntimeException e) {
            log.error("❌ Fehler beim Abrufen der Bestellung {}: {}", orderNumber, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Order not found or could not be loaded"));
        }
    }
}
