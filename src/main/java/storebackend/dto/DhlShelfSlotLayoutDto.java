package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.DhlShelfSlotLayout;

/**
 * DHL Shelf Slot Layout DTO (Phase 3A)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlShelfSlotLayoutDto {
    private Long id;
    private Long slotId;
    private String slotCode;
    private Integer capacity;
    private Integer occupiedCount;
    private Integer gridX;
    private Integer gridY;
    private Integer gridWidth;
    private Integer gridHeight;
    private Long zoneId;
    private String zoneName;
    private Boolean active;
    
    public static DhlShelfSlotLayoutDto fromEntity(DhlShelfSlotLayout layout, int occupiedCount) {
        if (layout == null) return null;
        
        DhlShelfSlotLayoutDto dto = new DhlShelfSlotLayoutDto();
        dto.setId(layout.getId());
        
        if (layout.getShelfSlot() != null) {
            dto.setSlotId(layout.getShelfSlot().getId());
            dto.setSlotCode(layout.getShelfSlot().getCode());
            dto.setCapacity(layout.getShelfSlot().getCapacity());
            dto.setActive(layout.getShelfSlot().getActive());
        }
        
        dto.setOccupiedCount(occupiedCount);
        dto.setGridX(layout.getGridX());
        dto.setGridY(layout.getGridY());
        dto.setGridWidth(layout.getGridWidth());
        dto.setGridHeight(layout.getGridHeight());
        
        if (layout.getZone() != null) {
            dto.setZoneId(layout.getZone().getId());
            dto.setZoneName(layout.getZone().getName());
        }
        
        return dto;
    }
}
