package storebackend.dto;

import lombok.Data;
import storebackend.enums.LineStatus;
import storebackend.enums.MappingSource;

import java.math.BigDecimal;
import java.util.List;

/**
 * Phase 3B-1B: Invoice line DTO for API responses.
 */
@Data
public class InvoiceLineDTO {
    private Long id;
    private Integer positionNumber;
    private String supplierArticleNumber;
    private String description;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal packagingUnit;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
    private BigDecimal taxRate;
    private BigDecimal discount;
    private Double confidence;
    private List<String> warnings;
    private LineStatus status;
    private MappingSource mappingSource;
    private Long suggestedProductId;
    private Boolean userCorrected;
}
