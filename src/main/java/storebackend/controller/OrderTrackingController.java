package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.OrderDetailsDTO;
import storebackend.dto.OrderListDTO;
import storebackend.dto.UpdateOrderStatusRequest;
import storebackend.entity.Order;
import storebackend.entity.User;
import storebackend.enums.OrderStatus;
import storebackend.enums.CustomerAccountMode;
import storebackend.repository.OrderRepository;
import storebackend.repository.UserRepository;
import storebackend.service.AuthService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller für Bestellverfolgung
 * Ermöglicht Kunden ihre Bestellungen zu sehen und verfolgen
 */
@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
@Slf4j
public class OrderTrackingController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final storebackend.repository.OrderItemRepository orderItemRepository;

    /**
     * Holt alle Bestellungen des aktuell eingeloggten Kunden
     * GET /api/public/customer/orders
     */
    @GetMapping("/customer/orders")
    public ResponseEntity<?> getCustomerOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "storeId", required = false) Long storeId) {

        try {
            // Extrahiere User-ID aus JWT
            Long userId = extractUserIdFromToken(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Authentication required",
                    "message", "Please login to view your orders"
                ));
            }

            log.info("📦 Loading orders for user: {}", userId);

            // Lade alle Bestellungen des Users
            List<Order> orders = storeId == null
                ? orderRepository.findByCustomerId(userId)
                : orderRepository.findByCustomerIdAndStoreIdOrderByCreatedAtDesc(userId, storeId);

            log.info("✅ Found {} orders for user {}", orders.size(), userId);

            // Konvertiere zu DTOs
            List<OrderListDTO> orderDTOs = orders.stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());

            return ResponseEntity.ok(orderDTOs);

        } catch (Exception e) {
            log.error("❌ Error loading customer orders: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal server error",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Holt Detail-Informationen einer bestimmten Bestellung
     * GET /api/public/customer/orders/{orderNumber}
     */
    @GetMapping("/customer/orders/{orderNumber}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOrderDetails(
            @PathVariable String orderNumber,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            Long userId = extractUserIdFromToken(authHeader);

            log.info("📦 Loading order details: {}, userId: {}", orderNumber, userId);

            var found = orderRepository.findByOrderNumber(orderNumber);
            if (found.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                    "error", "Not found", "message", "Order not found"
                ));
            }
            Order order = found.get();

            // In invite-only stores, order numbers alone must never reveal order details.
            if (order.getStore().getCustomerAccountMode() == CustomerAccountMode.INVITE_ONLY &&
                (userId == null || order.getCustomer() == null || !order.getCustomer().getId().equals(userId))) {
                return ResponseEntity.status(userId == null ? 401 : 403).body(Map.of(
                    "error", userId == null ? "Authentication required" : "Access denied",
                    "message", "This order is not available for this account"
                ));
            }

            // Security: Prüfe ob Order dem User gehört
            if (userId != null && order.getCustomer() != null &&
                !order.getCustomer().getId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "Access denied",
                    "message", "This order does not belong to you"
                ));
            }

            // Konvertiere zu DetailDTO
            OrderDetailsDTO dto = convertToDetailsDTO(order);

            return ResponseEntity.ok(dto);

        } catch (Exception e) {
            log.error("❌ Error loading order details: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal server error",
                "message", "Order details could not be loaded"
            ));
        }
    }

    /**
     * Admin: Aktualisiere Order-Status
     * PUT /api/admin/orders/{id}/status
     */
    @PutMapping("/admin/orders/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_PLATFORM_ADMIN')")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody UpdateOrderStatusRequest request) {

        try {
            log.info("🔄 Updating order {} to status: {}", id, request.getStatus());

            Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

            OrderStatus newStatus = OrderStatus.valueOf(request.getStatus());
            order.setStatus(newStatus);

            // Setze Timestamps basierend auf Status
            if (newStatus == OrderStatus.SHIPPED && order.getShippedAt() == null) {
                order.setShippedAt(LocalDateTime.now());
            }
            if (newStatus == OrderStatus.DELIVERED && order.getDeliveredAt() == null) {
                order.setDeliveredAt(LocalDateTime.now());
            }
            if (newStatus == OrderStatus.CANCELLED && order.getCancelledAt() == null) {
                order.setCancelledAt(LocalDateTime.now());
            }

            // Setze Tracking-Nummer falls vorhanden
            if (request.getTrackingNumber() != null && !request.getTrackingNumber().isEmpty()) {
                order.setTrackingNumber(request.getTrackingNumber());
            }

            orderRepository.save(order);

            log.info("✅ Order {} updated to status: {}", id, newStatus);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Order status updated successfully",
                "order", convertToDetailsDTO(order)
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Invalid status",
                "message", "Status must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED"
            ));
        } catch (Exception e) {
            log.error("❌ Error updating order status: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal server error",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Extrahiert User-ID aus JWT Token
     */
    private Long extractUserIdFromToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                return authService.getUserIdFromToken(token);
            } catch (Exception e) {
                log.warn("⚠️ Invalid JWT token: {}", e.getMessage());
            }
        }
        return null;
    }

    /**
     * Konvertiert Order zu OrderListDTO (für Liste)
     */
    private OrderListDTO convertToListDTO(Order order) {
        OrderListDTO dto = new OrderListDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setStatus(order.getStatus().name());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setShippedAt(order.getShippedAt());
        dto.setDeliveredAt(order.getDeliveredAt());

        // FIXED: Berechne tatsächliche Artikel-Anzahl aus der Datenbank
        int itemCount = orderItemRepository.findByOrderId(order.getId())
            .stream()
            .mapToInt(item -> item.getQuantity())
            .sum();
        dto.setItemCount(itemCount);

        return dto;
    }

    /**
     * Konvertiert Order zu OrderDetailsDTO (mit allen Details)
     */
    private OrderDetailsDTO convertToDetailsDTO(Order order) {
        OrderDetailsDTO dto = new OrderDetailsDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setStatus(order.getStatus().name());
        dto.setTrackingNumber(order.getTrackingNumber());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setNotes(order.getNotes());
        dto.setShippingAddress(order.getShippingAddress());
        dto.setBillingAddress(order.getBillingAddress());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setShippedAt(order.getShippedAt());
        dto.setDeliveredAt(order.getDeliveredAt());
        dto.setCancelledAt(order.getCancelledAt());
        dto.setCustomerEmail(order.getCustomerEmail());
        dto.setItems(orderItemRepository.findByOrderId(order.getId()).stream().map(item -> {
            OrderDetailsDTO.OrderItemDTO itemDto = new OrderDetailsDTO.OrderItemDTO();
            itemDto.setId(item.getId());
            itemDto.setProductName(item.getProductName());
            itemDto.setVariantName(item.getVariantTitle());
            itemDto.setQuantity(item.getQuantity());
            itemDto.setPrice(item.getPrice());
            itemDto.setSubtotal(item.getTotal());
            return itemDto;
        }).collect(Collectors.toList()));

        // Status-Historie (Timeline) - FIXED: Explizite Liste statt Stream mit null-Werten
        List<Map<String, Object>> statusHistory = new java.util.ArrayList<>();
        if (order.getCreatedAt() != null) {
            statusHistory.add(Map.of("status", "PENDING", "timestamp", order.getCreatedAt()));
        }
        if (order.getShippedAt() != null) {
            statusHistory.add(Map.of("status", "SHIPPED", "timestamp", order.getShippedAt()));
        }
        if (order.getDeliveredAt() != null) {
            statusHistory.add(Map.of("status", "DELIVERED", "timestamp", order.getDeliveredAt()));
        }
        if (order.getCancelledAt() != null) {
            statusHistory.add(Map.of("status", "CANCELLED", "timestamp", order.getCancelledAt()));
        }
        dto.setStatusHistory(statusHistory);

        return dto;
    }
}
