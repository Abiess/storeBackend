package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.CancellationReason;

/**
 * Request DTO für Paket-Stornierung
 * 
 * Phase 3A.4 - Paket-Korrektur
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CancelParcelRequest {
    
    /**
     * Grund der Stornierung (REQUIRED)
     */
    private CancellationReason reason;
    
    /**
     * Optionale Notiz/Freitext (max 500 Zeichen)
     */
    private String note;
}
