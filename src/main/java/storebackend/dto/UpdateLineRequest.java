package storebackend.dto;

import lombok.Data;

/**
 * Phase 3B-1B: Request to update an invoice line.
 */
@Data
public class UpdateLineRequest {
    private String supplierArticleNumber;
    private String description;
    private java.math.BigDecimal quantity;
    private String unit;
    private java.math.BigDecimal packagingUnit;
    private java.math.BigDecimal unitPrice;
    private java.math.BigDecimal lineTotal;
    private java.math.BigDecimal taxRate;
    private java.math.BigDecimal discount;
}
