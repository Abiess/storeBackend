package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response: Import gestartet / abgeschlossen
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WooCommerceImportResponse {
    
    private Long jobId;
    private String status;            // IN_PROGRESS | COMPLETED | FAILED
    
    // Counts
    private Integer importedCount;
    private Integer skippedCount;
    private Integer failedCount;
    
    // Warnings
    private List<String> warnings;
    
    // i18n message key
    private String messageKey;
    
    // Optional: backwards compatibility
    private Integer totalProducts;
    private Integer estimatedTime;
    private String message;
}

