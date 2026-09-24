package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO für Staffelpreise / Mengenpreise.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductTierPriceDTO {
    private Long id;
    private Long productId;
    private Integer minimumQuantity;
    private BigDecimal unitPrice;
    private String label;
    private Boolean active;
    private Integer sortOrder;
}
