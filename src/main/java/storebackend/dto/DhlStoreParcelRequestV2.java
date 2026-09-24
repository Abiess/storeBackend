package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request für erweiterte Paket-Einlagerung (Phase 2)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlStoreParcelRequestV2 {
    private String trackingCode;
    private String mode;  // "auto" or "manual"
    private String slotCode;  // Nur bei mode=manual
    private String notes;
}
