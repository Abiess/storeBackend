package storebackend.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DHL Update Slot Request (Phase 3A.5)
 * 
 * Request für Fach bearbeiten
 * 
 * Beispiel:
 * {
 *   "capacity": 10,
 *   "active": false,
 *   "description": "Regal rechts oben"
 * }
 * 
 * VALIDIERUNGEN:
 * - Capacity darf nicht unter occupied count reduziert werden
 * - Belegtes Fach darf nicht deaktiviert werden
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlUpdateSlotRequest {
    
    /**
     * Neue Kapazität (optional)
     * 
     * Minimum: 1
     * VALIDATION: capacity >= occupiedCount
     */
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;
    
    /**
     * Aktiv-Status (optional)
     * 
     * true  = Slot kann genutzt werden
     * false = Slot temporär deaktiviert
     * 
     * VALIDATION: Belegtes Fach darf nicht deaktiviert werden
     */
    private Boolean active;
    
    /**
     * Beschreibung (optional)
     */
    private String description;
}
