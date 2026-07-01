package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response: Import gestartet
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WooCommerceImportResponse {
    
    private Long jobId;
    private String status;            // RUNNING
    private Integer totalProducts;
    private Integer estimatedTime;    // Geschätzte Zeit in Sekunden (optional)
    private String message;
}
