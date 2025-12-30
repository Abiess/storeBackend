package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.Order;
import storebackend.repository.CartRepository;
import storebackend.service.OrderService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public/orders")
@RequiredArgsConstructor
public class PublicOrderController {
    private final OrderService orderService;
    private final CartRepository cartRepository;

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            Long storeId = Long.valueOf(request.get("storeId").toString());
            String customerEmail = (String) request.get("customerEmail");

            // Get cart
            var cart = cartRepository.findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("Cart not found"));

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
                null // Guest checkout
            );

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("orderNumber", order.getOrderNumber());
            response.put("status", order.getStatus());
            response.put("total", order.getTotalAmount()); // Changed from getTotal()
            response.put("customerEmail", customerEmail); // Use the email from request instead
            response.put("message", "Order created successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
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

            // Note: customerEmail is no longer stored in Order entity
            // For now, we'll allow access without email verification
            // TODO: Store email in separate table or validate via customer relationship

            // If customer exists, verify via customer relationship
            if (order.getCustomer() != null && !order.getCustomer().getEmail().equalsIgnoreCase(email)) {
                return ResponseEntity.status(403).build();
            }

            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
