package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Response für Bereinigung von WooCommerce-Produktbeschreibungen.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CleanWooCommerceDescriptionsResponse {
    
    /**
     * Anzahl geprüfter Produkte.
     */
    private Integer checked;
    
    /**
     * Anzahl Produkte, die HTML enthalten und bereinigt werden sollten/wurden.
     */
    private Integer affected;
    
    /**
     * Anzahl tatsächlich aktualisierter Produkte (nur bei dryRun=false).
     */
    private Integer updated;
    
    /**
     * War dies ein Dry-Run?
     */
    private Boolean dryRun;
    
    /**
     * Liste betroffener Produkte mit Vorschau.
     */
    @Builder.Default
    private List<ProductCleanupPreview> products = new ArrayList<>();
    
    /**
     * Fehler bei einzelnen Produkten.
     */
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    
    /**
     * Vorschau eines betroffenen Produkts.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductCleanupPreview {
        private Long id;
        private String title;
        private String before; // Gekürzte Vorschau (max 100 Zeichen)
        private String after;  // Gekürzte Vorschau (max 100 Zeichen)
        private Boolean wouldChange; // Würde sich tatsächlich ändern?
    }
}
