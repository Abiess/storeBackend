package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.enums.OrderStatus;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final InventoryService inventoryService;

    @Transactional(readOnly = true)
    public List<Order> getOrdersByStore(Long storeId) {
        return orderRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersByStoreAndStatus(Long storeId, OrderStatus status) {
        return orderRepository.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, status);
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersByCustomer(Long customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    @Transactional(readOnly = true)
    public Order getOrderByNumber(String orderNumber) {
        return orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    @Transactional
    public Order createOrderFromCart(Long cartId, String customerEmail,
                                     String shippingFirstName, String shippingLastName,
                                     String shippingAddress1, String shippingAddress2,
                                     String shippingCity, String shippingPostalCode,
                                     String shippingCountry, String shippingPhone,
                                     String billingFirstName, String billingLastName,
                                     String billingAddress1, String billingAddress2,
                                     String billingCity, String billingPostalCode,
                                     String billingCountry, String notes,
                                     User customer) {

        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        List<CartItem> cartItems = cartItemRepository.findByCartId(cartId);
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        // Calculate total (simplified - only total amount is stored now)
        BigDecimal total = cartItems.stream()
                .map(item -> item.getPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Add tax and shipping to total
        BigDecimal tax = total.multiply(BigDecimal.valueOf(0.19)); // 19% MwSt
        BigDecimal shipping = BigDecimal.valueOf(5.00); // Fixed shipping
        total = total.add(tax).add(shipping);

        // Create order with only fields that exist in DB
        Order order = new Order();
        order.setStore(cart.getStore());
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(total);
        // Note: Shipping/Billing address fields no longer stored in Order table
        // Consider storing them in separate OrderAddress table if needed

        Order savedOrder = orderRepository.save(order);

        // Create order items
        for (CartItem cartItem : cartItems) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(savedOrder);
            orderItem.setVariant(cartItem.getVariant());
            orderItem.setProductName(cartItem.getVariant().getProduct().getTitle());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(cartItem.getPriceSnapshot());
            orderItem.setProductSnapshot(createProductSnapshot(cartItem.getVariant()));
            orderItemRepository.save(orderItem);

            // Reduce inventory
            inventoryService.adjustInventory(
                cartItem.getVariant().getId(),
                -cartItem.getQuantity(),
                "SALE",
                "Order " + savedOrder.getOrderNumber(),
                customer
            );
        }

        // Create initial status history
        createStatusHistory(savedOrder, OrderStatus.PENDING, "Order created", null);

        // Clear cart
        cartItemRepository.deleteByCartId(cartId);

        return savedOrder;
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus status, String note, User updatedBy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(status);
        Order savedOrder = orderRepository.save(order);

        // Create status history entry
        createStatusHistory(savedOrder, status, note, updatedBy);

        return savedOrder;
    }

    @Transactional(readOnly = true)
    public List<OrderStatusHistory> getOrderHistory(Long orderId) {
        return orderStatusHistoryRepository.findByOrderIdOrderByTimestampDesc(orderId);
    }

    @Transactional(readOnly = true)
    public List<OrderItem> getOrderItems(Long orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    private void createStatusHistory(Order order, OrderStatus status, String note, User updatedBy) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setStatus(status);
        history.setNote(note);
        history.setUpdatedBy(updatedBy);
        orderStatusHistoryRepository.save(history);
    }

    private String createProductSnapshot(ProductVariant variant) {
        // Simple JSON snapshot - in production use Jackson or similar
        return String.format("{\"productTitle\":\"%s\",\"sku\":\"%s\",\"attributes\":%s}",
                variant.getProduct().getTitle(),
                variant.getSku(),
                variant.getAttributesJson());
    }
}
