package storebackend.dto;

import lombok.Data;
import storebackend.entity.Address;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO für Bestelldetails (vollständige Ansicht)
 */
@Data
public class OrderDetailsDTO {
    private Long id;
    private String orderNumber;
    private String status;
    private String trackingNumber;
    private BigDecimal totalAmount;
    private String notes;
    private String customerEmail;
    private CustomerDTO customer;
    private Address shippingAddress;
    private Address billingAddress;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private List<OrderItemDTO> items;
    private List<Map<String, Object>> statusHistory;

    // ─── Currency & Tax Snapshot ─────────────────────────────────
    private String currencyCode;  // EUR, MAD, USD, GBP (zum Zeitpunkt der Bestellung)
    private String priceMode;     // GROSS oder NET (zum Zeitpunkt der Bestellung)
    private String countryCode;   // DE, MA, etc. (zum Zeitpunkt der Bestellung)
    
    // ─── Tax Breakdown ─────────────────────────────────
    private BigDecimal subtotalNet;
    private BigDecimal subtotalGross;
    private BigDecimal taxTotal;
    private BigDecimal shippingNet;
    private BigDecimal shippingTax;
    private BigDecimal shippingGross;
    private BigDecimal totalNet;
    private BigDecimal totalGross;
    private BigDecimal discountNet;
    private BigDecimal discountTax;
    private BigDecimal discountGross;
    private String couponCodeSnapshot;
    private String discountTypeSnapshot;
    private BigDecimal discountValueSnapshot;

    /**
     * Innere Klasse für Kundeninformationen
     */
    @Data
    public static class CustomerDTO {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
    }

    /**
     * Innere Klasse für Bestellpositionen
     */
    @Data
    public static class OrderItemDTO {
        private Long id;
        private String productName;
        private String variantName;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal subtotal;
        private String imageUrl;
        
        // ─── Tax Snapshot ─────────────────────────────────
        private String taxCategory;        // STANDARD, REDUCED, ZERO, EXEMPT
        private BigDecimal taxRate;        // z.B. 19.00 oder 7.00
        private BigDecimal unitPriceNet;   // Einzelpreis netto
        private BigDecimal unitPriceGross; // Einzelpreis brutto
        private BigDecimal lineNet;        // Zeilensumme netto
        private BigDecimal lineTax;        // Zeilensumme Steuer
        private BigDecimal lineGross;      // Zeilensumme brutto
    }
}
