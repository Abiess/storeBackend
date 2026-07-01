package storebackend.dto.woocommerce;

import lombok.Data;

/**
 * Request: WooCommerce Import starten
 */
@Data
public class WooCommerceImportRequest {
    
    /**
     * Bestehende Produkte aktualisieren? (MVP: false = Skip)
     */
    private Boolean updateExisting = false;
    
    /**
     * Bilder importieren?
     */
    private Boolean importImages = true;
    
    /**
     * Max. Anzahl Produkte (null = alle)
     * Wird durch Plan-Limits begrenzt
     */
    private Integer limit;
    
    /**
     * Ab Seite X importieren (für teilweisen Import)
     */
    private Integer startPage = 1;
}
