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
    
    // Customer counts (wenn importCustomers=true)
    private Integer customersImported;        // Neu erstellt
    private Integer customersLinked;          // Existierender User → neuem Store zugeordnet
    private Integer customersSkipped;         // Bereits im Store vorhanden
    private Integer customersFailed;          // Fehler beim Import
    
    // Customer pagination
    private Integer customerCurrentPage;
    private Integer customerNextPage;
    private Integer customerPageSize;
    private Boolean hasMoreCustomers;
    
    // Importierte Kunden (nur neue, nicht linked) für Aktivierungsversand
    private List<ImportedCustomerDto> importedCustomers;
    
    // Warnings
    private List<String> warnings;
    
    // i18n message key
    private String messageKey;
    
    // Optional: backwards compatibility
    private Integer totalProducts;
    private Integer estimatedTime;
    private String message;
}

