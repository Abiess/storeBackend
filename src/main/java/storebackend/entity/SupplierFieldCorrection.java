package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.SupplierCorrectionFieldType;

import java.time.LocalDateTime;

/**
 * Learned field corrections for supplier invoices (Phase 3A).
 * 
 * When OCR/parser gets a field wrong and user corrects it,
 * store the mapping for future invoices.
 * 
 * Example:
 * - rawValue: "R wm oe GmbH" (OCR output)
 * - correctedValue: "MARZOUK HANDELS GMBH" (user confirmed)
 * → Future invoices with "R wm oe GmbH" will suggest "MARZOUK HANDELS GMBH"
 */
@Entity
@Table(name = "supplier_field_correction")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierFieldCorrection {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    
    @Column(name = "supplier_id")
    private Long supplierId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false, length = 50)
    private SupplierCorrectionFieldType fieldType;
    
    @Column(name = "raw_value", nullable = false, columnDefinition = "TEXT")
    private String rawValue;
    
    @Column(name = "normalized_raw_value", nullable = false, columnDefinition = "TEXT")
    private String normalizedRawValue;
    
    @Column(name = "corrected_value", nullable = false, columnDefinition = "TEXT")
    private String correctedValue;
    
    @Column(name = "normalized_corrected_value", nullable = false, columnDefinition = "TEXT")
    private String normalizedCorrectedValue;
    
    @Column(name = "confirmation_count", nullable = false)
    private Integer confirmationCount = 1;
    
    @Column(name = "active", nullable = false)
    private Boolean active = true;
    
    @Column(name = "created_by")
    private Long createdBy;
    
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
}
