package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for store products (imported supplier products).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreProductDTO {
    private Long id;
    private Long storeId;
    private Long supplierProductId;

    // Product details (from supplier product)
    private String title;
    private String description;
    private String primaryImageUrl;

    // Pricing
    private BigDecimal wholesalePrice; // What supplier gets
    private BigDecimal retailPrice; // What customer pays
    private BigDecimal marginPercentage; // Reseller's margin
    private BigDecimal marginAmount; // Calculated: retailPrice - wholesalePrice

    // Supplier info
    private Long supplierId;
    private String supplierName;

    // Status
    private Boolean isActive;
    private LocalDateTime importedAt;
    private LocalDateTime updatedAt;
}

