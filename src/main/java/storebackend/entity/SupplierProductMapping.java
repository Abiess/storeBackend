package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phase 3B-1B: Learned association between supplier article numbers and store products.
 */
@Entity
@Table(name = "supplier_product_mapping")
@Data
public class SupplierProductMapping {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    
    // Supplier identification
    @Column(name = "supplier_name", length = 255, nullable = false)
    private String supplierName;
    
    @Column(name = "normalized_supplier_name", length = 255, nullable = false)
    private String normalizedSupplierName;
    
    @Column(name = "supplier_article_number", length = 100, nullable = false)
    private String supplierArticleNumber;
    
    // Optional fallback matching
    @Column(name = "normalized_description", length = 500)
    private String normalizedDescription;
    
    // Mapped product
    @Column(name = "product_id", nullable = false)
    private Long productId;
    
    // Phase 3B-3: Master Data Learning - corrected values for future invoices
    @Column(name = "corrected_description", length = 1000)
    private String correctedDescription;
    
    @Column(name = "default_unit", length = 50)
    private String defaultUnit;
    
    @Column(name = "default_packaging_unit", precision = 19, scale = 4)
    private BigDecimal defaultPackagingUnit;
    
    @Column(name = "default_tax_rate", precision = 5, scale = 2)
    private BigDecimal defaultTaxRate;
    
    @Column(name = "last_confirmed_at")
    private LocalDateTime lastConfirmedAt;
    
    // Legacy fields (kept for backward compatibility)
    @Column(name = "packaging_unit", precision = 19, scale = 4)
    private BigDecimal packagingUnit;
    
    @Column(name = "unit", length = 50)
    private String unit;
    
    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;
    
    // Learning metadata
    @Column(name = "confirmation_count", nullable = false)
    private Integer confirmationCount = 1;
    
    @Column(name = "active", nullable = false)
    private Boolean active = true;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (confirmationCount == null) {
            confirmationCount = 1;
        }
        if (active == null) {
            active = true;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
