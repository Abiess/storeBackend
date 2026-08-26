package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request: Paket einlagern
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlStoreParcelRequest {
    /**
     * Roher Tracking-Code (wird serverseitig normalisiert)
     */
    private String trackingCode;
    
    /**
     * Lagerplatz im Shop
     * z.B. "Regal B-12", "Fach 3"
     */
    private String shelfLocation;
    
    /**
     * Optionale Notizen
     */
    private String notes;
}
