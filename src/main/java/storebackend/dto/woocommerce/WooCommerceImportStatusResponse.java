package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response: Import Job Status (für Async-Import)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WooCommerceImportStatusResponse {
    
    private Long jobId;
    private String status;            // RUNNING | SUCCESS | FAILED | CANCELLED
    
    // Progress
    private Integer progress;         // 0-100
    private Integer totalProducts;
    private Integer importedProducts;
    private Integer skippedProducts;
    private Integer failedProducts;
    private Integer totalCategories;
    private Integer importedCategories;
    
    // Current Activity
    private String currentProductName;
    
    // Timestamps
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    // Error
    private String errorMessage;
    
    /**
     * Ist der Job noch aktiv?
     */
    public Boolean isRunning() {
        return "RUNNING".equals(status);
    }
    
    /**
     * Ist der Job erfolgreich abgeschlossen?
     */
    public Boolean isSuccess() {
        return "SUCCESS".equals(status);
    }
}
