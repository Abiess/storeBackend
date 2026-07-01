package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response: Import Log Entry
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WooCommerceImportLogDto {
    
    private Long id;
    private Long jobId;
    private Long woocommerceProductId;
    private Long productId;             // markt.ma Product ID (null wenn skipped/error)
    private String sku;
    private String productName;
    private String status;              // SUCCESS | SKIPPED | ERROR | UPDATED
    private String errorMessage;
    private Integer variantsImported;
    private Integer imagesImported;
    private LocalDateTime importedAt;
}
