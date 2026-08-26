package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.DhlShelfSlot;

/**
 * DHL Shelf Slot Response mit Belegungsstatus
 * 
 * Phase 2.1: capacity + occupiedCount für mehrere Pakete pro Slot
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlSlotResponse {
    private Long id;
    private String code;
    private Integer sortOrder;
    private Boolean active;
    private String description;
    
    // Phase 2.1: Kapazität und Belegung
    private Integer capacity;      // Maximale Anzahl Pakete
    private Integer occupiedCount; // Aktuell eingelagerte Pakete
    private Boolean occupied;      // Deprecated (für Kompatibilität)
    
    public static DhlSlotResponse fromEntity(DhlShelfSlot slot, int occupiedCount) {
        DhlSlotResponse dto = new DhlSlotResponse();
        dto.setId(slot.getId());
        dto.setCode(slot.getCode());
        dto.setSortOrder(slot.getSortOrder());
        dto.setActive(slot.getActive());
        dto.setDescription(slot.getDescription());
        dto.setCapacity(slot.getCapacity());
        dto.setOccupiedCount(occupiedCount);
        dto.setOccupied(occupiedCount >= slot.getCapacity()); // true wenn voll
        return dto;
    }
}
