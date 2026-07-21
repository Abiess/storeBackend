package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.OrderStatus;
import storebackend.enums.DeliveryType;
import storebackend.enums.DeliveryMode;
import storebackend.enums.PaymentMethod;
import storebackend.enums.CurrencyCode;
import storebackend.enums.PriceMode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Column(name = "customer_email")
    private String customerEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    @Column(name = "tracking_carrier", length = 50)
    private String trackingCarrier;

    @Column(name = "tracking_url", length = 500)
    private String trackingUrl;
    
    // DHL Integration Fields
    @Column(name = "dhl_shipment_no", length = 100)
    private String dhlShipmentNo;
    
    @Column(name = "dhl_routing_code", length = 50)
    private String dhlRoutingCode;
    
    @Column(name = "dhl_uuid", length = 100)
    private String dhlUuid;
    
    @Column(name = "dhl_status", length = 50)
    private String dhlStatus;
    
    @Column(name = "dhl_created_at")
    private LocalDateTime dhlCreatedAt;
    
    @Column(name = "dhl_label_url", length = 500)
    private String dhlLabelUrl;

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;  // Legacy field - synchronisiert von totalGross via PrePersist

    // ─── Währungs- und Steuer-Snapshot (UNVERÄNDERLICH!) ──────────
    /**
     * Währung der Bestellung (Snapshot vom Store zum Bestellzeitpunkt)
     * WICHTIG: Bleibt unveränderlich, auch wenn Store-Währung später geändert wird
     * Default: EUR
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "currency_code", nullable = false, length = 3)
    private CurrencyCode currencyCode = CurrencyCode.EUR;

    /**
     * Preismodell (Snapshot vom Store zum Bestellzeitpunkt)
     * GROSS = Bruttopreise (inkl. MwSt.)
     * NET = Nettopreise (zzgl. MwSt.)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "price_mode", nullable = false, length = 10)
    private PriceMode priceMode = PriceMode.GROSS;

    /**
     * Land des Stores (Snapshot für Steuerberechnungen)
     * ISO 3166-1 alpha-2 (z.B. "DE", "MA")
     */
    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode = "DE";

    /**
     * Umsatzsteuer-Snapshot (Snapshot vom Store zum Bestellzeitpunkt)
     * true = Umsatzsteuer wird berechnet
     * false = Umsatzsteuer entfällt (alle TaxRates = 0)
     */
    @Column(name = "vat_enabled", nullable = false)
    private Boolean vatEnabled = true;

    // ─── Zwischensumme (Produkte ohne Versand) ────────────────────
    @Column(name = "subtotal_net", precision = 15, scale = 2)
    private BigDecimal subtotalNet;

    @Column(name = "subtotal_gross", precision = 15, scale = 2)
    private BigDecimal subtotalGross;

    @Column(name = "tax_total", precision = 15, scale = 2)
    private BigDecimal taxTotal;

    // ─── Versandkosten aufgeschlüsselt ────────────────────────────
    @Column(name = "shipping_net", precision = 15, scale = 2)
    private BigDecimal shippingNet;

    @Column(name = "shipping_tax", precision = 15, scale = 2)
    private BigDecimal shippingTax;

    @Column(name = "shipping_gross", precision = 15, scale = 2)
    private BigDecimal shippingGross;

    // ─── Gesamtsumme aufgeschlüsselt ──────────────────────────────
    @Column(name = "total_net", precision = 15, scale = 2)
    private BigDecimal totalNet;

    @Column(name = "total_gross", precision = 15, scale = 2)
    private BigDecimal totalGross;

    // ─── Rabatt (falls verwendet) ─────────────────────────────────
    @Column(name = "discount_net", precision = 15, scale = 2)
    private BigDecimal discountNet;

    @Column(name = "discount_tax", precision = 15, scale = 2)
    private BigDecimal discountTax;

    @Column(name = "discount_gross", precision = 15, scale = 2)
    private BigDecimal discountGross;
    
    // ─── Coupon-Snapshot (UNVERÄNDERLICH!) ────────────────────────
    @Column(name = "coupon_code_snapshot", length = 100)
    private String couponCodeSnapshot;
    
    @Column(name = "discount_type_snapshot", length = 20)
    private String discountTypeSnapshot;
    
    @Column(name = "discount_value_snapshot", precision = 15, scale = 2)
    private BigDecimal discountValueSnapshot;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // FIXED: Shipping Address eingebettet
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "firstName", column = @Column(name = "shipping_first_name")),
        @AttributeOverride(name = "lastName", column = @Column(name = "shipping_last_name")),
        @AttributeOverride(name = "address1", column = @Column(name = "shipping_address1")),
        @AttributeOverride(name = "address2", column = @Column(name = "shipping_address2")),
        @AttributeOverride(name = "city", column = @Column(name = "shipping_city")),
        @AttributeOverride(name = "postalCode", column = @Column(name = "shipping_postal_code")),
        @AttributeOverride(name = "country", column = @Column(name = "shipping_country")),
        @AttributeOverride(name = "phone", column = @Column(name = "shipping_phone"))
    })
    private Address shippingAddress;

    // FIXED: Billing Address eingebettet
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "firstName", column = @Column(name = "billing_first_name")),
        @AttributeOverride(name = "lastName", column = @Column(name = "billing_last_name")),
        @AttributeOverride(name = "address1", column = @Column(name = "billing_address1")),
        @AttributeOverride(name = "address2", column = @Column(name = "billing_address2")),
        @AttributeOverride(name = "city", column = @Column(name = "billing_city")),
        @AttributeOverride(name = "postalCode", column = @Column(name = "billing_postal_code")),
        @AttributeOverride(name = "country", column = @Column(name = "billing_country")),
        @AttributeOverride(name = "phone", column = @Column(name = "billing_phone"))  // FIXED: phone Mapping hinzugefügt
    })
    private Address billingAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    // DELIVERY FIELDS
    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", length = 20)
    private DeliveryType deliveryType;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", length = 20)
    private DeliveryMode deliveryMode;

    @Column(name = "delivery_provider_id")
    private Long deliveryProviderId;
    
    @Column(name = "shipping_provider", length = 50)
    private String shippingProvider; // "DHL", "PICKUP", "GLOBAL_DELIVERY", etc.

    @Column(name = "delivery_fee", precision = 10, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "eta_minutes")
    private Integer etaMinutes;

    // PAYMENT FIELDS
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;
    
    /**
     * Zahlungsstatus - unabhängig vom OrderStatus
     * Wird für PayPal-Zahlungen und andere Online-Payments verwendet
     * NULL für Zahlungen vor Ort (COD/Pickup) die keine externe Verarbeitung brauchen
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 30)
    private storebackend.enums.PaymentStatus paymentStatus;
    
    /**
     * Checkout-Token für Gast-Checkout und PayPal-Zahlungen
     * Wird beim Erstellen der Order generiert und für sichere Payment-Operationen verwendet
     * KRITISCH: Darf NICHT in Logs oder Fehlermeldungen erscheinen
     */
    @Column(name = "checkout_token", length = 255, unique = true)
    private String checkoutToken;

    @Column(name = "phone_verification_id")
    private Long phoneVerificationId;

    @Column(name = "phone_verified")
    private Boolean phoneVerified = false;
    
    // PACKAGE DIMENSIONS & WEIGHT (für Shipping/DHL/etc.)
    // Generische Felder, nutzbar für alle Versanddienstleister
    // Wenn NULL → Fallback auf Store Default Settings
    @Column(name = "package_weight_grams")
    private Integer packageWeightGrams;  // Gewicht in Gramm (z.B. 500, 1000, 1500)
    
    @Column(name = "package_length_mm")
    private Integer packageLengthMm;  // Länge in Millimetern
    
    @Column(name = "package_width_mm")
    private Integer packageWidthMm;  // Breite in Millimetern
    
    @Column(name = "package_height_mm")
    private Integer packageHeightMm;  // Höhe in Millimetern

    // MARKETPLACE: Order Items Collection
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderItem> orderItems = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (orderNumber == null) {
            orderNumber = "ORD-" + System.currentTimeMillis();
        }
        
        // ─── VALIDIERUNG statt automatischer Synchronisierung ─────────────────────────
        // Die fachliche Zuweisung totalAmount = totalGross sollte im Service erfolgen,
        // nicht versteckt im Entity-Hook. Hier nur noch finale Absicherung.
        if (this.totalAmount == null || this.totalGross == null) {
            throw new IllegalStateException(
                "Order must have totalAmount and totalGross calculated before persisting. " +
                "This is a critical bug - orders must be fully calculated in the service layer."
            );
        }
        
        // Konsistenz-Check
        if (this.totalAmount.compareTo(this.totalGross) != 0) {
            throw new IllegalStateException(
                String.format(
                    "Order totalAmount (%.2f) must equal totalGross (%.2f). " +
                    "This indicates a calculation error in the service layer.",
                    this.totalAmount, this.totalGross
                )
            );
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        
        // Bei Updates ebenfalls Konsistenz prüfen
        if (this.totalAmount != null && this.totalGross != null) {
            if (this.totalAmount.compareTo(this.totalGross) != 0) {
                throw new IllegalStateException(
                    String.format(
                        "Order totalAmount (%.2f) must equal totalGross (%.2f). " +
                        "This indicates a calculation error in the service layer.",
                        this.totalAmount, this.totalGross
                    )
                );
            }
        }
    }
}
