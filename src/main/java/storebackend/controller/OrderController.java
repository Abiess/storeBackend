package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.*;
import storebackend.enums.OrderStatus;
import storebackend.repository.StoreRepository;
import storebackend.service.OrderService;
import storebackend.service.StoreService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;
    private final StoreRepository storeRepository;
    private final StoreService storeService;

    /**
     * Prüft, ob der Benutzer Zugriff auf den Store hat
     */
    private boolean hasStoreAccess(Long storeId, User user) {
        if (user == null) {
            return false;
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return false;
        }

        // Owner hat immer Zugriff
        if (store.getOwner().getId().equals(user.getId())) {
            return true;
        }

        // Prüfe, ob der User über StoreService Zugriff hat (z.B. als Mitarbeiter)
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            return userStores.stream().anyMatch(s -> s.getId().equals(storeId));
        } catch (Exception e) {
            return false;
        }
    }

    @GetMapping
    public ResponseEntity<List<Order>> getOrders(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        if (status != null) {
            OrderStatus orderStatus = OrderStatus.valueOf(status);
            return ResponseEntity.ok(orderService.getOrdersByStoreAndStatus(storeId, orderStatus));
        }

        return ResponseEntity.ok(orderService.getOrdersByStore(storeId));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Order order = orderService.getOrderById(orderId);
        List<OrderItem> items = orderService.getOrderItems(orderId);

        Map<String, Object> response = new HashMap<>();
        response.put("order", order);
        response.put("items", items);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        OrderStatus status = OrderStatus.valueOf(request.get("status"));
        String note = request.get("note");

        Order updated = orderService.updateOrderStatus(orderId, status, note, user);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{orderId}/history")
    public ResponseEntity<List<OrderStatusHistory>> getOrderHistory(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(orderService.getOrderHistory(orderId));
    }

    /**
     * Bulk update order status
     */
    @PutMapping("/bulk-status")
    public ResponseEntity<?> bulkUpdateOrderStatus(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        try {
            @SuppressWarnings("unchecked")
            List<Long> orderIds = (List<Long>) request.get("orderIds");
            OrderStatus status = OrderStatus.valueOf((String) request.get("status"));
            String note = (String) request.get("note");

            List<Order> updated = orderService.bulkUpdateOrderStatus(orderIds, status, note, user);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update order tracking
     */
    @PutMapping("/{orderId}/tracking")
    public ResponseEntity<?> updateOrderTracking(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        try {
            String trackingCarrier = request.get("trackingCarrier");
            String trackingNumber = request.get("trackingNumber");
            String trackingUrl = request.get("trackingUrl");

            Order updated = orderService.updateOrderTracking(orderId, trackingCarrier, trackingNumber, trackingUrl, user);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Add internal note to order
     */
    @PostMapping("/{orderId}/notes")
    public ResponseEntity<?> addOrderNote(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        try {
            String note = request.get("note");
            if (note == null || note.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Note cannot be empty");
            }

            OrderStatusHistory history = orderService.addOrderNote(orderId, note, user);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
