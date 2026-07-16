package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.ProductStatus;
import storebackend.enums.TaxCategory;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = true) // CHANGED: nullable for supplier products
    private Store store;

    // MARKETPLACE: Supplier catalog support
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private User supplier;

    @Column(name = "is_supplier_catalog")
    private Boolean isSupplierCatalog = false;

    @Column(name = "wholesale_price", precision = 10, scale = 2)
    private BigDecimal wholesalePrice; // Supplier's base price for resellers

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private String title;

    @Column(name = "sku")
    private String sku;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    /**
     * Optionale direkte Bild-URL (z.B. Starter-Pack-Default-Asset).
     * Fallback, wenn keine product_media-Einträge vorhanden sind.
     * Bricht bestehende Bild-Logik (media/primaryImageUrl) nicht.
     */
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.DRAFT;

    // Featured/Highlight Flags
    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    @Column(name = "featured_order")
    private Integer featuredOrder = 0;

    @Column(name = "view_count")
    private Long viewCount = 0L;

    @Column(name = "sales_count")
    private Long salesCount = 0L;

    // Review statistics (denormalized for performance)
    @Column(name = "average_rating", precision = 3, scale = 2)
    private java.math.BigDecimal averageRating = java.math.BigDecimal.ZERO;

    // ─── Steuerkonfiguration ──────────────────────────────────────
    /**
     * Steuerkategorie des Produkts
     * Default: STANDARD (regulärer Steuersatz 19%)
     * 
     * STANDARD: 19% (regulär)
     * REDUCED: 7% (ermäßigt, z.B. Lebensmittel, Bücher)
     * ZERO: 0% (Nullsteuersatz, aber umsatzsteuerpflichtig)
     * EXEMPT: Steuerfrei (0%, nicht umsatzsteuerpflichtig)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "tax_category", nullable = false, length = 20)
    private TaxCategory taxCategory = TaxCategory.STANDARD;

    /**
     * Steuersatz in Prozent
     * Default: 19.00 (regulärer Steuersatz in Deutschland)
     * 
     * WICHTIG: Wird automatisch aus taxCategory abgeleitet:
     * - STANDARD → 19.00
     * - REDUCED → 7.00
     * - ZERO → 0.00
     * - EXEMPT → 0.00
     */
    @Column(name = "tax_rate", precision = 5, scale = 2, nullable = false)
    private BigDecimal taxRate = new BigDecimal("19.00");

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /** Lagerbestand für einfache Produkte (ohne Varianten) */
    @Column(name = "stock", nullable = false)
    private Integer stock = 0;

    // ── Telegram Import Flags ───────────────────────────────────────────────

    /**
     * Kein Preis im Telegram-Post erkannt → basePrice=1 gesetzt.
     * User muss vor Aktivierung manuell prüfen.
     */
    @Column(name = "price_needs_review", nullable = false)
    private boolean priceNeedsReview = false;

    /**
     * Herkunfts-Channel (@username oder ID) wenn aus Telegram importiert.
     * Null bei manuell angelegten Produkten.
     */
    @Column(name = "telegram_source", length = 255)
    private String telegramSource;

    /** Telegram Message-ID für Deduplizierung */
    @Column(name = "telegram_msg_id")
    private Long telegramMsgId;

    // ── Generic External Import Fields ──────────────────────────────────────

    /**
     * Import-Quelle: WOOCOMMERCE | SHOPIFY | TELEGRAM | MANUAL | etc.
     * Null = manuell angelegt
     */
    @Column(name = "external_source", length = 50)
    private String externalSource;

    /**
     * Externe Produkt-ID aus Quellsystem (z.B. WooCommerce Product ID)
     * Für Re-Import & Deduplizierung
     */
    @Column(name = "external_id", length = 100)
    private String externalId;

    /**
     * Externe SKU aus Quellsystem (für Duplikat-Check)
     */
    @Column(name = "external_sku", length = 255)
    private String externalSku;

    /**
     * Shop-URL des externen Systems (z.B. https://shop.example.com)
     */
    @Column(name = "external_store_url", length = 500)
    private String externalStoreUrl;

    /**
     * Letzter Import-Zeitpunkt (für Update-Tracking)
     */
    @Column(name = "last_imported_at")
    private LocalDateTime lastImportedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Explizite Getter/Setter für stock (Lombok-Kompatibilität)
    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock != null ? stock : 0;
    }
}
