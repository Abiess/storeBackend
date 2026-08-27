package storebackend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DHL Bulk Create Slots Request (Phase 3A.5)
 * 
 * Request für mehrere Fächer anlegen
 * 
 * Beispiel:
 * {
 *   "prefix": "A",
 *   "startNumber": 1,
 *   "count": 10,
 *   "capacity": 5,
 *   "description": "Regal links"
 * }
 * 
 * Erzeugt: A1, A2, A3, ..., A10
 * 
 * ATOMICITY:
 * - Server validiert ALLE Codes BEVOR Insert
 * - Bei einem Konflikt: KEIN neuer Slot wird erstellt
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlBulkCreateSlotsRequest {
    
    /**
     * Präfix (z.B. "A", "R", "SHELF")
     * 
     * Server normalisiert: trim() + toUpperCase()
     */
    @NotBlank(message = "Prefix is required")
    private String prefix;
    
    /**
     * Startnummer (z.B. 1 → A1, A2, ...)
     * 
     * Minimum: 1
     */
    @Min(value = 1, message = "Start number must be at least 1")
    private Integer startNumber;
    
    /**
     * Anzahl zu erstellender Fächer
     * 
     * Minimum: 1
     * Maximum: 100 (Performance-Limit)
     */
    @Min(value = 1, message = "Count must be at least 1")
    @Max(value = 100, message = "Count must not exceed 100")
    private Integer count;
    
    /**
     * Kapazität pro Fach
     * 
     * Minimum: 1
     */
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;
    
    /**
     * Optionale Beschreibung (wird für alle Fächer verwendet)
     */
    private String description;
}
