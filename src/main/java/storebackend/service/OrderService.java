package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import storebackend.dto.DeliveryOptionDTO;
import storebackend.dto.DeliveryOptionsRequestDTO;
import storebackend.dto.DeliveryOptionsResponseDTO;
import storebackend.dto.OrderDetailsDTO;
import storebackend.entity.*;
import storebackend.enums.DeliveryMode;
import storebackend.enums.DeliveryType;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentMethod;
import storebackend.event.OrderStatusChangedEvent;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final ApplicationEventPublisher eventPublisher;
    private final PublicDeliveryService publicDeliveryService;
    private final TaxCalculationService taxCalculationService;
    private final CouponService couponService;
    private final storebackend.repository.CouponRepository couponRepository;

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
                                     Long phoneVerificationId,
                                     DeliveryType deliveryType,
                                     DeliveryMode deliveryMode,
                                     String shippingProvider,
                                     List<String> appliedCouponCodes) {

        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        Store store = cart.getStore();
        
        List<CartItem> cartItems = cartItemRepository.findByCartId(cartId);
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        // ─── STORE-SNAPSHOT: Währung & Steuern zum Zeitpunkt der Bestellung ─────────
        storebackend.enums.CurrencyCode currencyCode = store.getCurrencyCode() != null 
            ? store.getCurrencyCode() 
            : storebackend.enums.CurrencyCode.EUR;
        
        String countryCode = store.getCountryCode() != null 
            ? store.getCountryCode() 
            : "DE";
        
        storebackend.enums.PriceMode priceMode = store.getPriceMode() != null 
            ? store.getPriceMode() 
            : storebackend.enums.PriceMode.GROSS;
        
        boolean vatEnabled = Boolean.TRUE.equals(store.getVatEnabled());

        // Calculate dynamic delivery fee based on delivery options
        BigDecimal deliveryFeeGross = BigDecimal.ZERO;
        Integer etaMinutes = null;

        // Strict validation and matching
        if (deliveryType == DeliveryType.PICKUP) {
            if (deliveryMode != null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "deliveryMode must be null for PICKUP"
                );
            }
            deliveryFeeGross = BigDecimal.ZERO;
            etaMinutes = null;

        } else if (deliveryType == DeliveryType.DELIVERY) {
            if (deliveryMode == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "deliveryMode is required for DELIVERY"
                );
            }

            DeliveryOptionsRequestDTO deliveryRequest = new DeliveryOptionsRequestDTO(
                shippingPostalCode,
                shippingCity,
                shippingCountry
            );

            DeliveryOptionsResponseDTO deliveryOptions = publicDeliveryService.getDeliveryOptions(
                store.getId(),
                deliveryRequest
            );

            DeliveryOptionDTO matchingOption = deliveryOptions.getOptions().stream()
                .filter(opt -> opt.getDeliveryType() == deliveryType)
                .filter(opt -> opt.getDeliveryMode() == deliveryMode)
                .filter(DeliveryOptionDTO::isAvailable)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected delivery option is not available for this address"
                ));

            deliveryFeeGross = matchingOption.getFee();
            etaMinutes = matchingOption.getEtaMinutes();
        }

        // ─── BESTELLPOSITIONEN MIT TAX-SNAPSHOT BERECHNEN ─────────────────────────────
        BigDecimal subtotalNet = BigDecimal.ZERO;
        BigDecimal subtotalTax = BigDecimal.ZERO;
        BigDecimal subtotalGross = BigDecimal.ZERO;

        // Create order (save early to get ID for items)
        Order order = new Order();
        order.setStore(store);
        order.setCustomer(customer);
        order.setCustomerEmail(customerEmail);
        order.setStatus(OrderStatus.PENDING);
        order.setNotes(notes);
        order.setPaymentMethod(paymentMethod);
        order.setPhoneVerificationId(phoneVerificationId);
        order.setPhoneVerified(phoneVerificationId != null);

        // Store-Snapshot setzen
        order.setCurrencyCode(currencyCode);
        order.setCountryCode(countryCode);
        order.setPriceMode(priceMode);

        // Set delivery information
        order.setDeliveryType(deliveryType);
        order.setDeliveryMode(deliveryMode);
        order.setEtaMinutes(etaMinutes);
        order.setShippingProvider(shippingProvider);

        // Set addresses
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

        // Create order items with tax calculations
        for (CartItem cartItem : cartItems) {
            
            ProductVariant variant = cartItem.getVariant();
            Product product = variant != null ? variant.getProduct() : cartItem.getProduct();


            if (product == null) {
                throw new RuntimeException("CartItem has neither variant nor product");
            }

            // Determine unit price (variant overrides product)
            // WICHTIG: priceSnapshot=0 bedeutet "nicht gesetzt", deshalb auf > 0 prüfen
            BigDecimal unitPrice = variant != null && variant.getPrice() != null && variant.getPrice().compareTo(BigDecimal.ZERO) > 0
                ? variant.getPrice()
                : (cartItem.getPriceSnapshot() != null && cartItem.getPriceSnapshot().compareTo(BigDecimal.ZERO) > 0
                    ? cartItem.getPriceSnapshot() 
                    : product.getBasePrice());
            

            // Determine tax category and rate
            storebackend.enums.TaxCategory taxCategory = product.getTaxCategory() != null
                ? product.getTaxCategory()
                : storebackend.enums.TaxCategory.STANDARD;

            BigDecimal taxRate = product.getTaxRate() != null
                ? product.getTaxRate()
                : (store.getDefaultTaxRate() != null 
                    ? store.getDefaultTaxRate() 
                    : new BigDecimal("19.00"));

            // Falls Umsatzsteuer deaktiviert: alles auf 0
            if (!vatEnabled) {
                taxCategory = storebackend.enums.TaxCategory.EXEMPT;
                taxRate = BigDecimal.ZERO;
            }

            // Calculate unit breakdown
            
            TaxCalculationService.TaxBreakdown unitBreakdown = 
                taxCalculationService.calculatePriceBreakdown(unitPrice, taxRate, priceMode);
            

            // Calculate line totals
            int quantity = cartItem.getQuantity();
            BigDecimal quantityBD = BigDecimal.valueOf(quantity);

            BigDecimal lineNet = unitBreakdown.net().multiply(quantityBD)
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTax = unitBreakdown.tax().multiply(quantityBD)
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineGross = unitBreakdown.gross().multiply(quantityBD)
                .setScale(2, RoundingMode.HALF_UP);


            // Create order item
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(savedOrder);
            orderItem.setProduct(product);
            orderItem.setVariant(variant);
            orderItem.setName(product.getTitle());
            orderItem.setProductName(product.getTitle());
            orderItem.setQuantity(quantity);

            if (variant != null) {
                orderItem.setSku(variant.getSku());
                orderItem.setVariantTitle(variant.getAttributesJson());
            } else {
                orderItem.setSku(product.getSku());
                orderItem.setVariantTitle(null);
            }

            // Tax snapshot
            orderItem.setTaxCategory(taxCategory);
            orderItem.setTaxRate(taxRate);
            orderItem.setUnitPriceNet(unitBreakdown.net());
            orderItem.setUnitPriceGross(unitBreakdown.gross());
            orderItem.setLineNet(lineNet);
            orderItem.setLineTax(lineTax);
            orderItem.setLineGross(lineGross);

            // Legacy fields for compatibility
            orderItem.setPrice(unitBreakdown.gross());
            orderItem.setTotal(lineGross);

            orderItem.setProductSnapshot(variant != null
                ? createProductSnapshot(variant)
                : createProductSnapshotFromProduct(product));

            enrichOrderItemWithMarketplaceData(orderItem, product, store);
            
            
            orderItemRepository.save(orderItem);
            

            // Accumulate subtotals
            subtotalNet = subtotalNet.add(lineNet);
            subtotalTax = subtotalTax.add(lineTax);
            subtotalGross = subtotalGross.add(lineGross);

            // Reduce inventory
            if (variant != null) {
                inventoryService.adjustInventory(
                    variant.getId(),
                    -quantity,
                    "SALE",
                    "Order " + savedOrder.getOrderNumber(),
                    customer
                );
            }
        }

        // ─── RABATT/COUPON BERECHNEN (falls vorhanden) ───────────────────────────
        // Items aus DB laden für Rabattberechnung (savedOrder.items ist noch nicht initialisiert)
        List<OrderItem> savedItems = orderItemRepository.findByOrderId(savedOrder.getId());
        
        savedItems.forEach(item -> {
        });
        
        DiscountBreakdown discountBreakdown = calculateDiscountBreakdown(
            appliedCouponCodes,
            store,
            savedItems,
            subtotalGross.setScale(2, RoundingMode.HALF_UP),
            customerEmail,
            null, // domainHost - kann später aus Request extrahiert werden
            vatEnabled,
            priceMode
        );
        
        BigDecimal discountNet = discountBreakdown.discountNet();
        BigDecimal discountTax = discountBreakdown.discountTax();
        BigDecimal discountGross = discountBreakdown.discountGross();
        boolean freeShipping = discountBreakdown.freeShipping();

        // ─── VERSANDSTEUER BERECHNEN ─────────────────────────────────────────────────
        BigDecimal shippingTaxRate = calculateShippingTaxRate(store, subtotalTax, subtotalGross);
        
        if (!vatEnabled) {
            shippingTaxRate = BigDecimal.ZERO;
        }
        
        // FREE_SHIPPING Coupon: Versandkosten entfallen
        BigDecimal actualDeliveryFee = freeShipping ? BigDecimal.ZERO : deliveryFeeGross;

        TaxCalculationService.TaxBreakdown shippingBreakdown =
            taxCalculationService.calculatePriceBreakdown(actualDeliveryFee, shippingTaxRate, priceMode);

        BigDecimal shippingNet = shippingBreakdown.net();
        BigDecimal shippingTax = shippingBreakdown.tax();
        BigDecimal shippingGross = shippingBreakdown.gross();

        // ─── ORDER-SUMMEN MIT RABATT SETZEN ───────────────────────────────────────────
        savedOrder.setSubtotalNet(subtotalNet.setScale(2, RoundingMode.HALF_UP));
        savedOrder.setSubtotalGross(subtotalGross.setScale(2, RoundingMode.HALF_UP));
        
        savedOrder.setDiscountNet(discountNet);
        savedOrder.setDiscountTax(discountTax);
        savedOrder.setDiscountGross(discountGross);
        savedOrder.setCouponCodeSnapshot(discountBreakdown.couponCode());
        savedOrder.setDiscountTypeSnapshot(discountBreakdown.discountType());
        savedOrder.setDiscountValueSnapshot(discountBreakdown.discountValue());
        
        savedOrder.setShippingNet(shippingNet);
        savedOrder.setShippingTax(shippingTax);
        savedOrder.setShippingGross(shippingGross);
        savedOrder.setDeliveryFee(shippingGross); // Legacy field
        
        // Formel: total = subtotal - discount + shipping
        BigDecimal taxTotal = subtotalTax
            .subtract(discountTax)
            .add(shippingTax)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalNet = subtotalNet
            .subtract(discountNet)
            .add(shippingNet)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalGross = subtotalGross
            .subtract(discountGross)
            .add(shippingGross)
            .setScale(2, RoundingMode.HALF_UP);
        
        savedOrder.setTaxTotal(taxTotal);
        savedOrder.setTotalNet(totalNet);
        savedOrder.setTotalGross(totalGross);
        savedOrder.setTotalAmount(totalGross); // Legacy field for compatibility

        orderRepository.save(savedOrder);

        // ─── COUPON-NUTZUNG FINALISIEREN (falls Coupon verwendet) ────────────────────
        if (discountBreakdown.validationRequest() != null && 
            !discountBreakdown.validCoupons().isEmpty()) {
            try {
                couponService.finalizeRedemptions(
                    store.getId(),
                    savedOrder.getId(),
                    discountBreakdown.validationRequest(),
                    discountBreakdown.validCoupons()
                );
            } catch (Exception e) {
                // Log error but don't fail order creation
                // (Order is already saved, coupon counter can be fixed manually)
                System.err.println("Failed to finalize coupon redemption: " + e.getMessage());
            }
        }

        // MARKETPLACE: Calculate and create commissions
        revenueShareService.createCommissionsForOrder(savedOrder);

        // Create initial status history
        createStatusHistory(savedOrder, OrderStatus.PENDING, "Order created", null);

        // Clear cart
        cartItemRepository.deleteByCartId(cartId);

        // Publish event for order confirmation email
        eventPublisher.publishEvent(new OrderStatusChangedEvent(this, savedOrder, null, OrderStatus.PENDING));

        return savedOrder;
    }

    /**
     * Berechnet den Steuersatz für Versandkosten basierend auf Store-Konfiguration
     */
    private BigDecimal calculateShippingTaxRate(Store store, BigDecimal subtotalTax, BigDecimal subtotalGross) {
        storebackend.enums.ShippingTaxStrategy strategy = store.getShippingTaxStrategy() != null
            ? store.getShippingTaxStrategy()
            : storebackend.enums.ShippingTaxStrategy.STORE_DEFINED;

        return switch (strategy) {
            case STORE_DEFINED -> store.getShippingTaxRate() != null
                ? store.getShippingTaxRate()
                : (store.getDefaultTaxRate() != null ? store.getDefaultTaxRate() : new BigDecimal("19.00"));
            
            case STANDARD_RATE -> store.getDefaultTaxRate() != null
                ? store.getDefaultTaxRate()
                : new BigDecimal("19.00");
            
            case PROPORTIONAL_TO_CART -> {
                // Proportional: durchschnittlicher Steuersatz aus Warenkorb
                if (subtotalGross.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal avgRate = subtotalTax
                        .multiply(new BigDecimal("100"))
                        .divide(subtotalGross.subtract(subtotalTax), 10, RoundingMode.HALF_UP);
                    yield avgRate.setScale(2, RoundingMode.HALF_UP);
                }
                // Fallback wenn Warenkorb leer oder Fehler
                yield store.getDefaultTaxRate() != null 
                    ? store.getDefaultTaxRate() 
                    : new BigDecimal("19.00");
            }
        };
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
        dto.setStatus(order.getStatus().name());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setShippingAddress(order.getShippingAddress());
        dto.setBillingAddress(order.getBillingAddress());
        dto.setNotes(order.getNotes());

        // Currency & Tax Snapshot
        dto.setCurrencyCode(order.getCurrencyCode() != null ? order.getCurrencyCode().name() : "EUR");
        dto.setCountryCode(order.getCountryCode() != null ? order.getCountryCode() : "DE");
        dto.setPriceMode(order.getPriceMode() != null ? order.getPriceMode().name() : "GROSS");

        // Tax Breakdown
        dto.setSubtotalNet(order.getSubtotalNet());
        dto.setSubtotalGross(order.getSubtotalGross());
        dto.setTaxTotal(order.getTaxTotal());
        dto.setShippingNet(order.getShippingNet());
        dto.setShippingTax(order.getShippingTax());
        dto.setShippingGross(order.getShippingGross());
        dto.setTotalNet(order.getTotalNet());
        dto.setTotalGross(order.getTotalGross());
        dto.setDiscountNet(order.getDiscountNet());
        dto.setDiscountTax(order.getDiscountTax());
        dto.setDiscountGross(order.getDiscountGross());
        dto.setCouponCodeSnapshot(order.getCouponCodeSnapshot());
        dto.setDiscountTypeSnapshot(order.getDiscountTypeSnapshot());
        dto.setDiscountValueSnapshot(order.getDiscountValueSnapshot());

        // Customer Info
        if (order.getCustomer() != null) {
            OrderDetailsDTO.CustomerDTO customerDTO = new OrderDetailsDTO.CustomerDTO();
            customerDTO.setId(order.getCustomer().getId());
            customerDTO.setEmail(order.getCustomer().getEmail());
            dto.setCustomer(customerDTO);
            dto.setCustomerEmail(order.getCustomer().getEmail());
        } else if (order.getCustomerEmail() != null) {
            dto.setCustomerEmail(order.getCustomerEmail());
        }

        // Order Items with Tax Snapshot
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<OrderDetailsDTO.OrderItemDTO> itemDTOs = items.stream()
            .map(item -> {
                OrderDetailsDTO.OrderItemDTO itemDTO = new OrderDetailsDTO.OrderItemDTO();
                itemDTO.setId(item.getId());
                itemDTO.setProductName(item.getProductName());
                itemDTO.setVariantName(item.getVariantTitle());
                itemDTO.setQuantity(item.getQuantity());
                itemDTO.setPrice(item.getPrice());
                itemDTO.setSubtotal(item.getTotal());
                
                // Tax Snapshot
                itemDTO.setTaxCategory(item.getTaxCategory() != null ? item.getTaxCategory().name() : null);
                itemDTO.setTaxRate(item.getTaxRate());
                itemDTO.setUnitPriceNet(item.getUnitPriceNet());
                itemDTO.setUnitPriceGross(item.getUnitPriceGross());
                itemDTO.setLineNet(item.getLineNet());
                itemDTO.setLineTax(item.getLineTax());
                itemDTO.setLineGross(item.getLineGross());
                
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

    private String createProductSnapshotFromProduct(Product product) {
        // Simple JSON snapshot for product without variant
        return String.format("{\"productTitle\":\"%s\",\"sku\":null,\"attributes\":{}}",
                product.getTitle());
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

    /**
     * Update order status and publish event for email notifications
     */
    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus newStatus, String notes, User updatedBy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        OrderStatus oldStatus = order.getStatus();

        // Update status
        order.setStatus(newStatus);

        // Update timestamps based on status
        switch (newStatus) {
            case SHIPPED:
                order.setShippedAt(java.time.LocalDateTime.now());
                break;
            case DELIVERED:
                order.setDeliveredAt(java.time.LocalDateTime.now());
                break;
            case CANCELLED:
                order.setCancelledAt(java.time.LocalDateTime.now());
                break;
        }

        // Save notes if provided
        if (notes != null && !notes.isEmpty()) {
            order.setNotes(notes);
        }

        order = orderRepository.save(order);

        // Add to status history
        createStatusHistory(order, newStatus, notes, updatedBy);

        // Publish event for email notification
        if (oldStatus != newStatus) {
            eventPublisher.publishEvent(new OrderStatusChangedEvent(this, order, oldStatus, newStatus));
        }

        return order;
    }

    /**
     * Bulk update order status for multiple orders
     */
    @Transactional
    public List<Order> bulkUpdateOrderStatus(List<Long> orderIds, OrderStatus newStatus, String notes, User updatedBy) {
        return orderIds.stream()
                .map(orderId -> updateOrderStatus(orderId, newStatus, notes, updatedBy))
                .collect(Collectors.toList());
    }

    /**
     * Update order tracking information
     */
    @Transactional
    public Order updateOrderTracking(Long orderId, String trackingCarrier, String trackingNumber, String trackingUrl, User updatedBy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setTrackingCarrier(trackingCarrier);
        order.setTrackingNumber(trackingNumber);
        order.setTrackingUrl(trackingUrl);

        order = orderRepository.save(order);

        // Add note to history
        String note = "Tracking updated: " + trackingCarrier + " - " + trackingNumber;
        createStatusHistory(order, order.getStatus(), note, updatedBy);

        return order;
    }

    /**
     * Add internal note to order (without changing status)
     */
    @Transactional
    public OrderStatusHistory addOrderNote(Long orderId, String note, User createdBy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setStatus(order.getStatus()); // Keep current status
        history.setNotes(note);
        history.setUpdatedBy(createdBy);

        return orderStatusHistoryRepository.save(history);
    }

    /**
     * Erstellt Tax Summary gruppiert nach Steuersätzen
     * Für Rechnungen und Checkout-Darstellung
     */
    public java.util.Map<BigDecimal, TaxSummary> buildTaxSummary(List<OrderItem> items, Order order) {
        java.util.Map<BigDecimal, TaxSummary> summaryMap = new java.util.HashMap<>();

        // Aggregiere Items nach Steuersatz
        for (OrderItem item : items) {
            BigDecimal taxRate = item.getTaxRate() != null 
                ? item.getTaxRate() 
                : BigDecimal.ZERO;

            TaxSummary existing = summaryMap.get(taxRate);
            if (existing == null) {
                existing = new TaxSummary(
                    taxRate,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
                );
            }

            existing = new TaxSummary(
                taxRate,
                existing.netAmount().add(item.getLineNet() != null ? item.getLineNet() : BigDecimal.ZERO),
                existing.taxAmount().add(item.getLineTax() != null ? item.getLineTax() : BigDecimal.ZERO),
                existing.grossAmount().add(item.getLineGross() != null ? item.getLineGross() : BigDecimal.ZERO)
            );

            summaryMap.put(taxRate, existing);
        }

        // Versandsteuer hinzufügen (falls vorhanden)
        if (order.getShippingTax() != null && order.getShippingTax().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal shippingTaxRate = calculateShippingTaxRate(
                order.getStore(),
                order.getTaxTotal(),
                order.getTotalGross()
            );

            TaxSummary existing = summaryMap.get(shippingTaxRate);
            if (existing == null) {
                existing = new TaxSummary(
                    shippingTaxRate,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
                );
            }

            existing = new TaxSummary(
                shippingTaxRate,
                existing.netAmount().add(order.getShippingNet() != null ? order.getShippingNet() : BigDecimal.ZERO),
                existing.taxAmount().add(order.getShippingTax() != null ? order.getShippingTax() : BigDecimal.ZERO),
                existing.grossAmount().add(order.getShippingGross() != null ? order.getShippingGross() : BigDecimal.ZERO)
            );

            summaryMap.put(shippingTaxRate, existing);
        }

        return summaryMap;
    }

    /**
     * Tax Summary Record für Steueraufschlüsselung
     */
    public record TaxSummary(
        BigDecimal taxRate,
        BigDecimal netAmount,
        BigDecimal taxAmount,
        BigDecimal grossAmount
    ) {}
    
    // ═══════════════════════════════════════════════════════════════════════════
    // COUPON/RABATT HELPER-KLASSEN
    // ═══════════════════════════════════════════════════════════════════════════
    
    private record DiscountBreakdown(
        BigDecimal discountNet,
        BigDecimal discountTax,
        BigDecimal discountGross,
        String couponCode,
        String discountType,
        BigDecimal discountValue,
        boolean freeShipping,
        storebackend.dto.ValidateCouponsRequest validationRequest,
        java.util.List<storebackend.dto.ValidCouponDTO> validCoupons
    ) {}
    
    /**
     * Berechnet Coupon-Rabatte mit korrekter Steuerverteilung.
     * PERCENT: Prozentualer Rabatt auf rabattfähige Positionen
     * FIXED: Fester Betrag proportional auf Positionen verteilt
     * FREE_SHIPPING: Versandkosten entfallen
     */
    private DiscountBreakdown calculateDiscountBreakdown(
            List<String> appliedCouponCodes,
            Store store,
            List<OrderItem> orderItems,
            BigDecimal subtotalGross,
            String customerEmail,
            String domainHost,
            boolean vatEnabled,
            storebackend.enums.PriceMode priceMode) {
        
        if (appliedCouponCodes == null || appliedCouponCodes.isEmpty()) {
            return new DiscountBreakdown(
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                null, null, null, false,
                null, java.util.Collections.emptyList()
            );
        }
        
        // ─── COUPON VALIDIERUNG ───────────────────────────────────────────────
        storebackend.dto.CartDTO cartDTO = new storebackend.dto.CartDTO();
        cartDTO.setCurrency(store.getCurrencyCode() != null ? store.getCurrencyCode().name() : "EUR");
        cartDTO.setSubtotalCents(subtotalGross.multiply(new BigDecimal("100")).longValue());
        cartDTO.setCustomerEmail(customerEmail);
        // Items für Validation
        java.util.List<storebackend.dto.CartItemDTO> cartItems = orderItems.stream()
            .map(oi -> {
                storebackend.dto.CartItemDTO item = new storebackend.dto.CartItemDTO();
                item.setProductId(oi.getProduct() != null ? oi.getProduct().getId() : 0L);
                item.setPriceCents(oi.getLineGross().multiply(new BigDecimal("100")).longValue());
                item.setQuantity(oi.getQuantity());
                item.setCategoryIds(java.util.Collections.emptyList());
                item.setCollectionIds(java.util.Collections.emptyList());
                return item;
            })
            .collect(java.util.stream.Collectors.toList());
        cartDTO.setItems(cartItems);
        
        storebackend.dto.ValidateCouponsRequest request = new storebackend.dto.ValidateCouponsRequest();
        request.setCart(cartDTO);
        request.setAppliedCodes(appliedCouponCodes);
        request.setDomainHost(domainHost != null ? domainHost : "");
        
        storebackend.dto.ValidateCouponsResponse response;
        try {
            response = couponService.validateCoupons(store.getId(), request);
        } catch (Exception e) {
            System.err.println("❌ COUPON VALIDATION ERROR: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Coupon validation failed: " + e.getMessage(), e);
        }
        
        if (!response.getInvalidCoupons().isEmpty()) {
            response.getInvalidCoupons().forEach(ic -> {
            });
        }
        
        if (response.getValidCoupons().isEmpty()) {
            if (!response.getInvalidCoupons().isEmpty()) {
                String errors = response.getInvalidCoupons().stream()
                    .map(ic -> ic.getCode() + ": " + ic.getReason())
                    .collect(java.util.stream.Collectors.joining(", "));
                throw new RuntimeException("Invalid coupons: " + errors);
            }
            return new DiscountBreakdown(
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                null, null, null, false,
                request, java.util.Collections.emptyList()
            );
        }
        
        // Nur ersten gültigen Coupon verwenden (Stacking-Regeln wurden bereits in validateCoupons angewandt)
        storebackend.dto.ValidCouponDTO validCoupon = response.getValidCoupons().get(0);
        
        // ─── COUPON LADEN FÜR DETAILS ─────────────────────────────────────────
        storebackend.entity.Coupon coupon = couponRepository.findById(validCoupon.getCouponId())
            .orElseThrow(() -> new RuntimeException("Coupon not found after validation"));
        
        boolean freeShipping = coupon.getType() == storebackend.entity.Coupon.CouponType.FREE_SHIPPING;
        
        // ─── RABATT BERECHNUNG ────────────────────────────────────────────────
        BigDecimal discountGross = BigDecimal.ZERO;
        BigDecimal discountNet = BigDecimal.ZERO;
        BigDecimal discountTax = BigDecimal.ZERO;
        
        if (coupon.getType() == storebackend.entity.Coupon.CouponType.PERCENT) {
            // Prozentualer Rabatt: Auf jede Position anwenden
            BigDecimal percent = new BigDecimal(coupon.getPercentDiscount()).divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP);
            
            for (OrderItem item : orderItems) {
                BigDecimal itemDiscountGross = item.getLineGross().multiply(percent).setScale(2, RoundingMode.HALF_UP);
                BigDecimal itemDiscountNet = item.getLineNet().multiply(percent).setScale(2, RoundingMode.HALF_UP);
                BigDecimal itemDiscountTax = item.getLineTax().multiply(percent).setScale(2, RoundingMode.HALF_UP);
                
                discountGross = discountGross.add(itemDiscountGross);
                discountNet = discountNet.add(itemDiscountNet);
                discountTax = discountTax.add(itemDiscountTax);
            }
            
        } else if (coupon.getType() == storebackend.entity.Coupon.CouponType.FIXED) {
            // Fester Rabatt: Proportional verteilen
            BigDecimal fixedAmount = new BigDecimal(coupon.getValueCents()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            
            
            // Begrenzung: Rabatt nicht größer als Warenwert
            if (fixedAmount.compareTo(subtotalGross) > 0) {
                fixedAmount = subtotalGross;
            }
            
            discountGross = fixedAmount;
            
            // Proportionale Verteilung auf Positionen für Steuerberechnung
            BigDecimal remainingDiscount = fixedAmount;
            BigDecimal eligibleGross = subtotalGross;
            
            // GUARD: Division by zero vermeiden
            if (eligibleGross.compareTo(BigDecimal.ZERO) == 0) {
                discountNet = BigDecimal.ZERO;
                discountTax = BigDecimal.ZERO;
            } else {
                for (int i = 0; i < orderItems.size(); i++) {
                    OrderItem item = orderItems.get(i);
                    boolean isLast = (i == orderItems.size() - 1);
                    
                    BigDecimal itemShare;
                    if (isLast) {
                        // Letzte Position übernimmt Rundungsdifferenz
                        itemShare = remainingDiscount;
                    } else {
                        itemShare = fixedAmount
                            .multiply(item.getLineGross())
                            .divide(eligibleGross, 10, RoundingMode.HALF_UP)
                            .setScale(2, RoundingMode.HALF_UP);
                        remainingDiscount = remainingDiscount.subtract(itemShare);
                    }
                    
                    
                    // Steueranteil des Rabatts berechnen
                    BigDecimal itemTaxRate = item.getTaxRate();
                    if (!vatEnabled) {
                        itemTaxRate = BigDecimal.ZERO;
                    }
                    
                    TaxCalculationService.TaxBreakdown discountBreakdown =
                        taxCalculationService.calculatePriceBreakdown(
                            itemShare,
                            itemTaxRate,
                            priceMode
                        );
                    
                    discountNet = discountNet.add(discountBreakdown.net());
                    discountTax = discountTax.add(discountBreakdown.tax());
                }
            }
        }
        
        // Rundung auf 2 Nachkommastellen
        discountNet = discountNet.setScale(2, RoundingMode.HALF_UP);
        discountTax = discountTax.setScale(2, RoundingMode.HALF_UP);
        discountGross = discountGross.setScale(2, RoundingMode.HALF_UP);
        
        // Snapshot-Werte
        String discountType = coupon.getType().name();
        BigDecimal discountValue = coupon.getType() == storebackend.entity.Coupon.CouponType.PERCENT
            ? new BigDecimal(coupon.getPercentDiscount())
            : new BigDecimal(coupon.getValueCents()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        
        return new DiscountBreakdown(
            discountNet, discountTax, discountGross,
            coupon.getCode(), discountType, discountValue, freeShipping,
            request, response.getValidCoupons()
        );
    }
}
