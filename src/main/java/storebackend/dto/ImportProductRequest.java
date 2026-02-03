package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for reseller to import a supplier product.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImportProductRequest {
    private Long supplierProductId;
    private BigDecimal retailPrice; // What customer will pay

    // Optional: if not provided, system calculates from wholesalePrice + recommended margin
    private BigDecimal marginPercentage; // e.g., 0.30 for 30%
}

