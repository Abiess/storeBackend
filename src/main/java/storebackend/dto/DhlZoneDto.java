package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.DhlZone;

/**
 * DHL Zone DTO (Phase 3A)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlZoneDto {
    private Long id;
    private String name;
    private String color;
    private Integer sortOrder;
    
    public static DhlZoneDto fromEntity(DhlZone zone) {
        if (zone == null) return null;
        
        DhlZoneDto dto = new DhlZoneDto();
        dto.setId(zone.getId());
        dto.setName(zone.getName());
        dto.setColor(zone.getColor());
        dto.setSortOrder(zone.getSortOrder());
        return dto;
    }
}
