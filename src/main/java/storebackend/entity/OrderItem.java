package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
