package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.enums.CustomerAccountMode;
import storebackend.enums.PaymentMethod;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.OrderItemRepository;
import storebackend.repository.OrderRepository;
import storebackend.security.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Customer-visible order requests for one invite-only store. */
@RestController
@RequestMapping("/api/public/customer/stores/{storeId}/orders")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InviteOnlyOrderController {
    private final JwtUtil jwtUtil;
    private final CustomerProfileRepository customerProfileRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    @GetMapping
    public ResponseEntity<?> list(@PathVariable Long storeId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = authenticatedUserId(authorization);
        if (userId == null) return ResponseEntity.status(401).build();
        if (!isInvitedCustomer(userId, storeId)) return ResponseEntity.status(403).build();

        List<OrderSummary> orders = orderRepository
            .findByCustomerIdAndStoreIdOrderByCreatedAtDesc(userId, storeId).stream()
            .filter(order -> order.getPaymentMethod() == PaymentMethod.ORDER_REQUEST)
            .map(order -> new OrderSummary(
                order.getOrderNumber(), order.getStatus().name(), order.getTotalAmount(),
                order.getCreatedAt(), order.getCurrencyCode().name(),
                orderItemRepository.findByOrderId(order.getId()).stream()
                    .mapToInt(OrderItem::getQuantity).sum()))
            .toList();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{orderNumber}")
    public ResponseEntity<?> detail(@PathVariable Long storeId, @PathVariable String orderNumber,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = authenticatedUserId(authorization);
        if (userId == null) return ResponseEntity.status(401).build();
        if (!isInvitedCustomer(userId, storeId)) return ResponseEntity.status(403).build();

        Order order = orderRepository.findByOrderNumber(orderNumber).orElse(null);
        if (order == null || order.getCustomer() == null ||
                !order.getCustomer().getId().equals(userId) ||
                !order.getStore().getId().equals(storeId) ||
                order.getPaymentMethod() != PaymentMethod.ORDER_REQUEST) {
            return ResponseEntity.notFound().build();
        }

        List<OrderLine> lines = orderItemRepository.findByOrderId(order.getId()).stream()
            .map(item -> new OrderLine(
                item.getProductName() != null ? item.getProductName() : item.getName(),
                item.getSku(), item.getVariantTitle(), item.getQuantity(),
                item.getPrice(), item.getTotal(),
                item.getProduct() != null ? item.getProduct().getImageUrl() : null))
            .toList();
        return ResponseEntity.ok(new OrderDetail(
            order.getOrderNumber(), order.getStatus().name(), order.getTotalAmount(),
            order.getCreatedAt(), order.getCurrencyCode().name(), lines));
    }

    private boolean isInvitedCustomer(Long userId, Long storeId) {
        return customerProfileRepository.findByUserIdAndStoreId(userId, storeId)
            .map(profile -> profile.getStore().getCustomerAccountMode() == CustomerAccountMode.INVITE_ONLY)
            .orElse(false);
    }

    private Long authenticatedUserId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        try {
            String token = authorization.substring(7);
            String email = jwtUtil.extractEmail(token);
            return jwtUtil.validateToken(token, email) ? jwtUtil.extractUserId(token) : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public record OrderSummary(String orderNumber, String status, BigDecimal totalAmount,
            LocalDateTime createdAt, String currencyCode, int itemCount) {}

    public record OrderLine(String productName, String sku, String variantName, int quantity,
            BigDecimal unitPrice, BigDecimal totalAmount, String imageUrl) {}

    public record OrderDetail(String orderNumber, String status, BigDecimal totalAmount,
            LocalDateTime createdAt, String currencyCode, List<OrderLine> items) {}
}
