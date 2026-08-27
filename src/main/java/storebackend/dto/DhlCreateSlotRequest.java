package storebackend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DHL Create Slot Request (Phase 3A.5)
 * 
 * Request für einzelnes Fach anlegen
 * 
 * Beispiel:
 * {
 *   "code": "A7",
 *   "capacity": 5,
 *   "description": "Regal links oben"
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlCreateSlotRequest {
    
    /**
     * Fach-Code (z.B. "A7", "R15", "S01")
     * 
     * Server normalisiert: trim() + toUpperCase()
     * Pro Store eindeutig
     */
    @NotBlank(message = "Slot code is required")
    private String code;
    
    /**
     * Kapazität: Wie viele Pakete passen rein?
     * 
     * Minimum: 1
     */
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;
    
    /**
     * Optionale Beschreibung
     * z.B. "Regal links oben", "Backoffice Schrank"
     */
    private String description;
}
