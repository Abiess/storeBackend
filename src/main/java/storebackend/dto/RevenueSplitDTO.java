package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Revenue split breakdown for an order item.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevenueSplitDTO {
    private Long orderItemId;
    private String productName;

    private BigDecimal customerPaid; // Total customer paid
    private BigDecimal supplierAmount; // Supplier gets
    private BigDecimal resellerAmount; // Reseller gets
    private BigDecimal platformAmount; // Platform gets

    private BigDecimal supplierPercentage;
    private BigDecimal resellerPercentage;
    private BigDecimal platformPercentage;
}
