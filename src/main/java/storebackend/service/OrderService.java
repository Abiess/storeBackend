package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.OrderDetailsDTO;
import storebackend.entity.*;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentMethod;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final InventoryService inventoryService;

    // MARKETPLACE: New dependencies for revenue sharing
    private final RevenueShareService revenueShareService;
    private final StoreProductRepository storeProductRepository;
    private final PlatformSettingsService platformSettingsService;

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
                                     User customer,
                                     PaymentMethod paymentMethod,
                                     Long phoneVerificationId) {

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

        // Create order with payment method and phone verification
        Order order = new Order();
        order.setStore(cart.getStore());
        order.setCustomer(customer);
        order.setCustomerEmail(customerEmail);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(total);
        order.setNotes(notes);
        order.setPaymentMethod(paymentMethod);
        order.setPhoneVerificationId(phoneVerificationId);
        order.setPhoneVerified(phoneVerificationId != null);

        // Set shipping address
        Address shippingAddr = new Address();
        shippingAddr.setFirstName(shippingFirstName);
        shippingAddr.setLastName(shippingLastName);
        shippingAddr.setAddress1(shippingAddress1);
        shippingAddr.setAddress2(shippingAddress2);
        shippingAddr.setCity(shippingCity);
        shippingAddr.setPostalCode(shippingPostalCode);
        shippingAddr.setCountry(shippingCountry);
        shippingAddr.setPhone(shippingPhone);
        order.setShippingAddress(shippingAddr);

        // Set billing address
        Address billingAddr = new Address();
        billingAddr.setFirstName(billingFirstName);
        billingAddr.setLastName(billingLastName);
        billingAddr.setAddress1(billingAddress1);
        billingAddr.setAddress2(billingAddress2);
        billingAddr.setCity(billingCity);
        billingAddr.setPostalCode(billingPostalCode);
        billingAddr.setCountry(billingCountry);
        order.setBillingAddress(billingAddr);

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

            // MARKETPLACE: Enrich order item with revenue split data
            enrichOrderItemWithMarketplaceData(orderItem, cartItem.getVariant().getProduct(), cart.getStore());

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

        // MARKETPLACE: Calculate and create commissions at checkout
        revenueShareService.createCommissionsForOrder(savedOrder);

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

    @Transactional(readOnly = true)
    public OrderDetailsDTO getOrderDetailsByNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        return convertToDTO(order);
    }

    private OrderDetailsDTO convertToDTO(Order order) {
        OrderDetailsDTO dto = new OrderDetailsDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setStatus(order.getStatus().name()); // FIXED: Enum zu String konvertieren
        dto.setTotalAmount(order.getTotalAmount());
        dto.setCreatedAt(order.getCreatedAt());

        // FIXED: Shipping und Billing Address hinzufügen
        dto.setShippingAddress(order.getShippingAddress());
        dto.setBillingAddress(order.getBillingAddress());
        dto.setNotes(order.getNotes());

        // Customer Info
        if (order.getCustomer() != null) {
            OrderDetailsDTO.CustomerDTO customerDTO = new OrderDetailsDTO.CustomerDTO();
            customerDTO.setId(order.getCustomer().getId());
            customerDTO.setEmail(order.getCustomer().getEmail());
            dto.setCustomer(customerDTO);
            dto.setCustomerEmail(order.getCustomer().getEmail());
        } else if (order.getCustomerEmail() != null) {
            // FIXED: Für Gast-Bestellungen
            dto.setCustomerEmail(order.getCustomerEmail());
        }

        // Order Items
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<OrderDetailsDTO.OrderItemDTO> itemDTOs = items.stream()
            .map(item -> {
                OrderDetailsDTO.OrderItemDTO itemDTO = new OrderDetailsDTO.OrderItemDTO();
                itemDTO.setId(item.getId());
                itemDTO.setProductName(item.getProductName());
                itemDTO.setVariantName(item.getProductName()); // Verwende productName auch als variantName
                itemDTO.setQuantity(item.getQuantity());
                itemDTO.setPrice(item.getPrice());  // FIXED: price statt priceAtOrder
                itemDTO.setSubtotal(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
                return itemDTO;
            })
            .collect(Collectors.toList());
        dto.setItems(itemDTOs);

        return dto;
    }

    private void createStatusHistory(Order order, OrderStatus status, String note, User updatedBy) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setStatus(status);
        history.setNotes(note);
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

    /**
     * MARKETPLACE: Enrich order item with supplier and pricing data for revenue split.
     * This snapshots all pricing data at order time for immutable commission calculation.
     */
    private void enrichOrderItemWithMarketplaceData(OrderItem orderItem, Product product, Store store) {
        // Check if this is an imported supplier product
        storeProductRepository.findByStoreAndSupplierProduct(store, product)
                .ifPresent(storeProduct -> {
                    // This is an imported product - save supplier info
                    Product supplierProduct = storeProduct.getSupplierProduct();
                    orderItem.setStoreProduct(storeProduct);
                    orderItem.setSupplierId(supplierProduct.getSupplier() != null
                            ? supplierProduct.getSupplier().getId()
                            : null);
                    orderItem.setWholesalePrice(supplierProduct.getWholesalePrice());
                });

        // Always set platform fee percentage (snapshot at order time)
        orderItem.setPlatformFeePercentage(platformSettingsService.getPlatformFeePercentage());
    }
}
