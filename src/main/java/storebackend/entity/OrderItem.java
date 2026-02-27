package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.FulfillmentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    // MARKETPLACE: Track imported products and revenue split
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_product_id")
    private StoreProduct storeProduct; // NULL for direct store products

    @Column(name = "supplier_id")
    private Long supplierId; // Snapshot at order time

    @Column(name = "wholesale_price", precision = 10, scale = 2)
    private BigDecimal wholesalePrice; // Snapshot of supplier's base price

    @Column(name = "platform_fee_percentage", precision = 5, scale = 4)
    private BigDecimal platformFeePercentage; // Snapshot (e.g., 0.05 = 5%)

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "sku")
    private String sku;

    @Column(name = "variant_title")
    private String variantTitle;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "product_name")
    private String productName;

    @Column(columnDefinition = "TEXT")
    private String productSnapshot; // JSON: Name, Image, Attributes zum Bestellzeitpunkt

    // ==================================================================================
    // DROPSHIPPING FULFILLMENT (Phase 1)
    // ==================================================================================

    /**
     * Fulfillment Status für Dropshipping Items
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_status", length = 50)
    private FulfillmentStatus fulfillmentStatus = FulfillmentStatus.PENDING;

    /**
     * Order ID beim Supplier (manuell eingegeben vom Reseller)
     */
    @Column(name = "supplier_order_id", length = 255)
    private String supplierOrderId;

    /**
     * Tracking-Nummer vom Supplier
     */
    @Column(name = "supplier_tracking_number", length = 255)
    private String supplierTrackingNumber;

    /**
     * Versanddienstleister des Suppliers (z.B. DHL, China Post)
     */
    @Column(name = "supplier_carrier", length = 100)
    private String supplierCarrier;

    /**
     * Zeitpunkt, wann Reseller beim Supplier bestellt hat
     */
    @Column(name = "ordered_from_supplier_at")
    private LocalDateTime orderedFromSupplierAt;

    /**
     * Zeitpunkt, wann Item als geliefert markiert wurde
     */
    @Column(name = "fulfilled_at")
    private LocalDateTime fulfilledAt;

    /**
     * Notizen zum Fulfillment-Prozess (für Reseller)
     */
    @Column(name = "fulfillment_notes", columnDefinition = "TEXT")
    private String fulfillmentNotes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        // Automatically calculate total if not set
        if (total == null && price != null && quantity != null) {
            total = price.multiply(BigDecimal.valueOf(quantity));
        }
    }
}
