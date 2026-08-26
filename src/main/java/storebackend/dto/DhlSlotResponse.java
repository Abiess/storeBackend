package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.DhlShelfSlot;

/**
 * DHL Shelf Slot Response mit Belegungsstatus
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
    private Boolean occupied;  // Wird zur Runtime berechnet
    
    public static DhlSlotResponse fromEntity(DhlShelfSlot slot, boolean occupied) {
        DhlSlotResponse dto = new DhlSlotResponse();
        dto.setId(slot.getId());
        dto.setCode(slot.getCode());
        dto.setSortOrder(slot.getSortOrder());
        dto.setActive(slot.getActive());
        dto.setDescription(slot.getDescription());
        dto.setOccupied(occupied);
        return dto;
    }
}
