package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for supplier products in the marketplace catalog.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierProductDTO {
    private Long id;
    private String title;
    private String description;
    private BigDecimal wholesalePrice; // What resellers pay
    private String status;
    private Long categoryId;
    private String categoryName;
    private Boolean isFeatured;
    private Long viewCount;
    private Long importCount; // How many stores imported this
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Supplier info
    private Long supplierId;
    private String supplierName;

    // Media
    private String primaryImageUrl;
}

