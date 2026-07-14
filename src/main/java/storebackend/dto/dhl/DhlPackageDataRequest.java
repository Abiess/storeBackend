package storebackend.dto.dhl;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO für DHL Validate/Label mit optionalen Paketdaten-Overrides
 * aus dem Frontend Dialog.
 * 
 * Diese Daten haben Priorität über Order-Felder und Store Defaults.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlPackageDataRequest {
    
    /**
     * Gewicht in Gramm (Optional - Override für Order/Store Default)
     * Beispiel: 1500g für 1.5kg
     */
    private Integer packageWeightGrams;
    
    /**
     * Länge in Millimetern (Optional - Override)
     * Beispiel: 400mm für 40cm
     */
    private Integer packageLengthMm;
    
    /**
     * Breite in Millimetern (Optional - Override)
     * Beispiel: 250mm für 25cm
     */
    private Integer packageWidthMm;
    
    /**
     * Höhe in Millimetern (Optional - Override)
     * Beispiel: 180mm für 18cm
     */
    private Integer packageHeightMm;
}
