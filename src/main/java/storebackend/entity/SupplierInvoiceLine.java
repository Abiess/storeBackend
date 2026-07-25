package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import storebackend.enums.LineStatus;
import storebackend.enums.MappingSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phase 3B-1: Parsed invoice line item storage.
 */
@Entity
@Table(name = "supplier_invoice_line")
@Data
public class SupplierInvoiceLine {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    
    @Column(name = "document_id", nullable = false)
    private Long documentId;
    
    @Column(name = "parse_result_id")
    private Long parseResultId;
    
    @Column(name = "position_number", nullable = false)
    private Integer positionNumber;
    
    @Column(name = "supplier_article_number", length = 100)
    private String supplierArticleNumber;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "quantity", precision = 19, scale = 3)
    private BigDecimal quantity;
    
    @Column(name = "unit", length = 50)
    private String unit;
    
    @Column(name = "packaging_unit", precision = 19, scale = 2)
    private BigDecimal packagingUnit;
    
    @Column(name = "unit_price", precision = 19, scale = 4)
    private BigDecimal unitPrice;
    
    @Column(name = "line_total", precision = 19, scale = 4)
    private BigDecimal lineTotal;
    
    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;
    
    @Column(name = "discount", precision = 5, scale = 2)
    private BigDecimal discount;
    
    @Column(name = "confidence")
    private Double confidence;
    
    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;
    
    @Column(name = "warnings_json", columnDefinition = "TEXT")
    private String warningsJson;
    
    // Phase 3B-1B: Status and mapping fields
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    private LineStatus status = LineStatus.UNREVIEWED;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "mapping_source", length = 50)
    private MappingSource mappingSource;
    
    @Column(name = "suggested_product_id")
    private Long suggestedProductId;
    
    @Column(name = "user_corrected", nullable = false)
    private Boolean userCorrected = false;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = LineStatus.UNREVIEWED;
        }
        if (userCorrected == null) {
            userCorrected = false;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
