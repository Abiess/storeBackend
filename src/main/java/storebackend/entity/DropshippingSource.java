package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.SupplierType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Dropshipping Source - Supplier Link und Einkaufspreis pro Variant
 * Nur für ROLE_RESELLER
 */
@Entity
@Table(name = "dropshipping_sources")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DropshippingSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Die Product Variant, die von diesem Supplier kommt
     * 1:1 Beziehung - jede Variant hat max. 1 Dropshipping Source
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false, unique = true)
    private ProductVariant variant;

    /**
     * Supplier Type: MANUAL (Link-based) oder CJ (API-based)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_type", nullable = false, length = 20)
    private SupplierType supplierType = SupplierType.MANUAL;

    /**
     * URL zum Supplier-Produkt (z.B. Alibaba, AliExpress, CJ Dropshipping)
     */
    @Column(name = "supplier_url", nullable = false, length = 1000)
    private String supplierUrl;

    /**
     * Name des Suppliers (z.B. "Alibaba", "AliExpress Shop XYZ")
     */
    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    /**
     * Einkaufspreis vom Supplier (für Margin-Berechnung)
     */
    @Column(name = "purchase_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    /**
     * Geschätzte Lieferzeit vom Supplier in Tagen
     */
    @Column(name = "estimated_shipping_days")
    private Integer estimatedShippingDays;

    /**
     * SKU beim Supplier (falls abweichend)
     */
    @Column(name = "supplier_sku", length = 255)
    private String supplierSku;

    /**
     * CJ Dropshipping Product ID (für API Integration)
     */
    @Column(name = "cj_product_id", length = 255)
    private String cjProductId;

    /**
     * CJ Dropshipping Variant ID (für API Integration)
     */
    @Column(name = "cj_variant_id", length = 255)
    private String cjVariantId;

    /**
     * Notizen für den Reseller (z.B. Mindestbestellmenge, Zahlungsmethode)
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Wer hat diesen Supplier-Link erstellt (Reseller)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Berechnet die Profit-Marge zwischen Einkaufs- und Verkaufspreis
     * @param salePrice Verkaufspreis der Variant
     * @return Marge in Prozent (z.B. 0.45 = 45%)
     */
    public BigDecimal calculateMargin(BigDecimal salePrice) {
        if (salePrice == null || salePrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal profit = salePrice.subtract(purchasePrice);
        return profit.divide(salePrice, 4, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Berechnet den absoluten Gewinn
     */
    public BigDecimal calculateProfit(BigDecimal salePrice) {
        if (salePrice == null) {
            return BigDecimal.ZERO;
        }
        return salePrice.subtract(purchasePrice);
    }
}

