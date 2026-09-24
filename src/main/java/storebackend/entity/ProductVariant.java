package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(length = 100)
    private String barcode;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "compare_price", precision = 10, scale = 2)
    private BigDecimal comparePrice;

    @Column(name = "cost_price", precision = 10, scale = 2)
    private BigDecimal costPrice;

    @Column(nullable = false)
    private Integer stockQuantity;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(precision = 10, scale = 3)
    private BigDecimal weight;

    @Column(length = 255)
    private String option1;

    @Column(length = 255)
    private String option2;

    @Column(length = 255)
    private String option3;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrls; // JSON array of image URLs: ["url1", "url2", ...]

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String attributesJson;

    // ── Generic External Import Fields ──────────────────────────────────────

    /**
     * Import-Quelle: WOOCOMMERCE | SHOPIFY | TELEGRAM | MANUAL | etc.
     */
    @Column(name = "external_source", length = 50)
    private String externalSource;

    /**
     * Externe Varianten-ID aus Quellsystem (z.B. WooCommerce Variation ID)
     */
    @Column(name = "external_id", length = 100)
    private String externalId;

    /**
     * Externe SKU aus Quellsystem
     */
    @Column(name = "external_sku", length = 255)
    private String externalSku;

    /**
     * Letzter Import-Zeitpunkt
     */
    @Column(name = "last_imported_at")
    private java.time.LocalDateTime lastImportedAt;


    // Explizite Getter/Setter für Lombok-Kompatibilität
    public Long getId() {
        return id;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }
}
