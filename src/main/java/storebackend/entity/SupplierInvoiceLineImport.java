package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phase 4A: Import-Log für Rechnungspositionen.
 * 
 * Protokolliert jeden Import und verhindert via UNIQUE constraint
 * auf (document_id, line_id) die versehentliche doppelte Buchung
 * derselben Rechnungsposition.
 */
@Entity
@Table(
    name = "supplier_invoice_line_import",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_invoice_line_import",
        columnNames = {"document_id", "line_id"}
    )
)
@Data
@NoArgsConstructor
public class SupplierInvoiceLineImport {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    
    @Column(name = "document_id", nullable = false)
    private Long documentId;
    
    @Column(name = "line_id", nullable = false)
    private Long lineId;
    
    @Column(name = "product_id")
    private Long productId;
    
    /** CREATE_PRODUCT | UPDATE_STOCK */
    @Column(nullable = false, length = 50)
    private String action;
    
    @Column(name = "stock_before")
    private Integer stockBefore;
    
    @Column(name = "stock_change", nullable = false)
    private Integer stockChange;
    
    @Column(name = "stock_after")
    private Integer stockAfter;
    
    @Column(name = "purchase_price", precision = 10, scale = 2)
    private BigDecimal purchasePrice;
    
    /** SUCCESS | FAILED */
    @Column(nullable = false, length = 20)
    private String status = "SUCCESS";
    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;
    
    @Column(name = "imported_by")
    private Long importedBy;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (importedAt == null) importedAt = LocalDateTime.now();
    }
}
