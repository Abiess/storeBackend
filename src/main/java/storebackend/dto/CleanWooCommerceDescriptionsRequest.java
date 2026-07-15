package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request für Bereinigung von WooCommerce-Produktbeschreibungen.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CleanWooCommerceDescriptionsRequest {
    
    /**
     * Store-ID (optional).
     * Wenn nicht angegeben, werden alle Stores des Users bereinigt.
     */
    private Long storeId;
    
    /**
     * Dry-Run-Modus.
     * true = Nur Vorschau, nichts speichern
     * false = Tatsächlich bereinigen und speichern
     */
    @Builder.Default
    private Boolean dryRun = true;
}
