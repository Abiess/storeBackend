package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.PosOrderItemRequest;
import storebackend.dto.PosOrderRequest;
import storebackend.dto.PosOrderResponse;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.repository.OrderRepository;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * POS Order Service
 * 
 * Spezialisierter Service für Point-of-Sale Verkäufe.
 * 
 * WICHTIGE SECURITY-ASPEKTE:
 * 1. Preise NIEMALS vom Frontend vertrauen → serverseitig laden
 * 2. Multi-Tenant: productId MUSS zu storeId gehören
 * 3. Stock-Reduktion atomar mit Pessimistic Lock (Race Condition Prevention)
 * 4. Keine Cross-Store Products
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PosOrderService {
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final LoyaltyService loyaltyService;

    /**
     * Erstellt POS-Verkauf (Order mit source = POS)
     * 
     * Flow:
     * 1. Store laden
     * 2. Produkte serverseitig laden + validieren
     * 3. Stock atomar reduzieren (mit Lock)
     * 4. Order + OrderItems erstellen
     * 5. Response mit Rückgeld (für CASH)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param request POS Order Request (paymentMethod, items)
     * @return PosOrderResponse mit Order-Details
     * @throws RuntimeException bei Validation/Stock-Fehlern
     */
    @Transactional
    public PosOrderResponse createPosOrder(Long storeId, PosOrderRequest request) {
        log.info("Creating POS order for store {}, payment: {}, items: {}", 
            storeId, request.getPaymentMethod(), request.getItems().size());

        // 1. Validation
        if (!request.isValid()) {
            throw new IllegalArgumentException("Invalid POS order request");
        }

        // 2. Store laden
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // 3. PaymentMethod konvertieren
        PaymentMethod paymentMethod;
        try {
            paymentMethod = PaymentMethod.valueOf(request.getPaymentMethod());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid payment method: " + request.getPaymentMethod());
        }

        if (paymentMethod != PaymentMethod.CASH && paymentMethod != PaymentMethod.CARD_EXTERNAL) {
            throw new IllegalArgumentException("POS only supports CASH or CARD_EXTERNAL");
        }

        // 4. Order erstellen
        Order order = new Order();
        order.setStore(store);
        order.setOrderSource(OrderSource.POS);
        order.setStatus(OrderStatus.CONFIRMED); // POS ist sofort confirmed
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(storebackend.enums.PaymentStatus.PAID); // POS ist sofort bezahlt
        order.setOrderNumber(generateOrderNumber());
        order.setCustomer(null); // POS kann ohne Customer sein
        order.setCustomerEmail(null);

        // Store-Snapshots (für Tax-Berechnungen)
        order.setCurrencyCode(store.getCurrencyCode() != null ? store.getCurrencyCode() : CurrencyCode.EUR);
        order.setPriceMode(store.getPriceMode() != null ? store.getPriceMode() : PriceMode.GROSS);
        order.setCountryCode(store.getCountryCode() != null ? store.getCountryCode() : "DE");
        order.setVatEnabled(store.getVatEnabled() != null ? store.getVatEnabled() : true);

        // POS-spezifisch: kein Versand
        order.setDeliveryType(null);
        order.setDeliveryMode(null);
        order.setShippingProvider(null);
        order.setDeliveryFee(BigDecimal.ZERO);
        order.setShippingNet(BigDecimal.ZERO);
        order.setShippingTax(BigDecimal.ZERO);
        order.setShippingGross(BigDecimal.ZERO);

        // Inventory wird reduziert
        order.setInventoryAdjusted(true);
        
        // POS Cash Payment: cashReceived und cashChange speichern (für Beleg!)
        if (paymentMethod == PaymentMethod.CASH && request.getCashReceived() != null) {
            order.setCashReceived(request.getCashReceived());
            // cashChange wird nach Gesamtsummenberechnung gesetzt (siehe unten)
        } else {
            order.setCashReceived(null);
            order.setCashChange(null);
        }

        // 5. OrderItems erstellen + Stock reduzieren
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotalNet = BigDecimal.ZERO;
        BigDecimal subtotalGross = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;

        for (PosOrderItemRequest itemRequest : request.getItems()) {
            // 5.1 Produkt laden MIT LOCK (Race Condition Prevention)
            Product product = productRepository.findByIdForUpdate(itemRequest.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + itemRequest.getProductId()));

            // 5.2 SECURITY: Produkt MUSS zu Store gehören
            if (!product.getStore().getId().equals(storeId)) {
                throw new SecurityException("Product " + itemRequest.getProductId() + 
                    " does not belong to store " + storeId);
            }

            // 5.3 Stock Check + Reduktion (atomar in derselben Transaktion)
            if (product.getStock() < itemRequest.getQuantity()) {
                throw new RuntimeException("Insufficient stock for product: " + product.getTitle() + 
                    ". Available: " + product.getStock() + ", Requested: " + itemRequest.getQuantity());
            }
            product.setStock(product.getStock() - itemRequest.getQuantity());
            productRepository.save(product);

            log.info("Stock reduced: product={}, oldStock={}, newStock={}, quantity={}", 
                product.getId(), product.getStock() + itemRequest.getQuantity(), 
                product.getStock(), itemRequest.getQuantity());

            // 5.4 OrderItem erstellen mit SERVER-PREISEN (niemals Frontend vertrauen!)
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setName(product.getTitle()); // Snapshot Name
            orderItem.setProductName(product.getTitle()); // CRITICAL: DB has NOT NULL constraint
            orderItem.setSku(product.getSku());
            orderItem.setQuantity(itemRequest.getQuantity());

            // WICHTIG: basePrice vom Server verwenden!
            BigDecimal unitPrice = product.getBasePrice();
            orderItem.setPrice(unitPrice); // Legacy field

            // Zeilensumme
            BigDecimal lineTotal = unitPrice.multiply(new BigDecimal(itemRequest.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);
            orderItem.setTotal(lineTotal); // Legacy field

            // Tax-Snapshot
            orderItem.setTaxRate(product.getTaxRate() != null ? product.getTaxRate() : BigDecimal.ZERO);
            orderItem.setTaxCategory(product.getTaxCategory() != null ? product.getTaxCategory() : TaxCategory.STANDARD);

            // Tax-Berechnung (GROSS Preismodell = Brutto)
            // Netto = Brutto / (1 + taxRate/100)
            // Steuer = Brutto - Netto
            BigDecimal taxRateDecimal = orderItem.getTaxRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            BigDecimal unitNet = unitPrice.divide(BigDecimal.ONE.add(taxRateDecimal), 2, RoundingMode.HALF_UP);
            BigDecimal unitTax = unitPrice.subtract(unitNet).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineNet = unitNet.multiply(new BigDecimal(itemRequest.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTax = unitTax.multiply(new BigDecimal(itemRequest.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineGross = lineTotal; // Already calculated above

            // CRITICAL: Set all NOT NULL fields required by DB schema
            orderItem.setUnitPriceNet(unitNet);
            orderItem.setUnitPriceGross(unitPrice);
            orderItem.setLineNet(lineNet);
            orderItem.setLineTax(lineTax);
            orderItem.setLineGross(lineGross);

            subtotalNet = subtotalNet.add(lineNet);
            subtotalGross = subtotalGross.add(lineTotal);
            taxTotal = taxTotal.add(lineTax);

            orderItems.add(orderItem);
        }

        // 6. Summen setzen
        order.setSubtotalNet(subtotalNet);
        order.setSubtotalGross(subtotalGross);
        order.setTaxTotal(taxTotal);

        // POS: Kein Rabatt, kein Versand
        order.setDiscountNet(BigDecimal.ZERO);
        order.setDiscountTax(BigDecimal.ZERO);
        order.setDiscountGross(BigDecimal.ZERO);

        // Gesamt = Subtotal (kein Versand bei POS)
        order.setTotalNet(subtotalNet);
        order.setTotalGross(subtotalGross);
        order.setTotalAmount(subtotalGross); // Legacy field

        // Cash Change berechnen und speichern (für Beleg!)
        if (paymentMethod == PaymentMethod.CASH && request.getCashReceived() != null) {
            BigDecimal cashChange = request.getCashReceived().subtract(subtotalGross)
                .setScale(2, RoundingMode.HALF_UP);
            if (cashChange.compareTo(BigDecimal.ZERO) < 0) {
                cashChange = BigDecimal.ZERO; // kein negatives Rückgeld
            }
            order.setCashChange(cashChange);
        }

        order.setOrderItems(orderItems);

        // 7. Order speichern
        Order savedOrder = orderRepository.save(order);

        log.info("POS order created: orderNumber={}, total={}, items={}", 
            savedOrder.getOrderNumber(), savedOrder.getTotalGross(), orderItems.size());

        // 7b. Loyalty: Einkauf zuordnen, falls Code mitgeschickt wurde
        // Bestehender Kaufprozess ruft LoyaltyService auf - keine zweite Checkout-Logik.
        Integer loyaltyPointsEarned = null;
        Integer loyaltyNewBalance = null;
        if (request.getLoyaltyCode() != null && !request.getLoyaltyCode().isBlank()) {
            try {
                var loyaltyResult = loyaltyService.recordPurchase(
                    storeId, request.getLoyaltyCode(), savedOrder.getTotalGross(), savedOrder
                );
                loyaltyPointsEarned = loyaltyResult.getPointsEarned();
                loyaltyNewBalance = loyaltyResult.getNewBalance();
            } catch (RuntimeException ex) {
                // Loyalty-Fehler dürfen den Verkauf NICHT blockieren (Order ist bereits gespeichert)
                log.warn("Loyalty purchase recording failed for order {}: {}",
                    savedOrder.getOrderNumber(), ex.getMessage());
            }
        }

        // 8. Response erstellen
        BigDecimal cashChange = null;
        if (paymentMethod == PaymentMethod.CASH && request.getCashReceived() != null) {
            cashChange = request.getCashReceived().subtract(savedOrder.getTotalGross())
                .setScale(2, RoundingMode.HALF_UP);
            if (cashChange.compareTo(BigDecimal.ZERO) < 0) {
                cashChange = BigDecimal.ZERO; // kein negatives Rückgeld
            }
        }

        PosOrderResponse response = new PosOrderResponse();
        response.setOrderId(savedOrder.getId());
        response.setOrderNumber(savedOrder.getOrderNumber());
        response.setTotalGross(savedOrder.getTotalGross());
        response.setTaxTotal(savedOrder.getTaxTotal());
        response.setCashChange(cashChange);
        response.setStatus(savedOrder.getStatus());
        response.setCreatedAt(savedOrder.getCreatedAt());
        response.setLoyaltyPointsEarned(loyaltyPointsEarned);
        response.setLoyaltyNewBalance(loyaltyNewBalance);
        return response;
    }

    /**
     * Generiert eindeutige Order-Nummer
     * Format: POS-YYYYMMDD-XXXXX
     */
    private String generateOrderNumber() {
        String timestamp = LocalDateTime.now().format(
            java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "POS-" + timestamp + "-" + random;
    }
}
