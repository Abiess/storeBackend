package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request: WooCommerce Import starten
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WooCommerceImportRequest {
    
    /**
     * Specific product IDs to import (optional).
     * If null or empty, import all products from preview.
     */
    private List<Long> productIds;
    
    /**
     * Bilder importieren?
     */
    @Builder.Default
    private boolean importImages = true;
    
    /**
     * Bestehende Produkte überspringen?
     */
    @Builder.Default
    private boolean skipExisting = true;
    
    /**
     * Max. Anzahl Produkte (null = alle, max 50 für MVP)
     */
    private Integer limit;
}

