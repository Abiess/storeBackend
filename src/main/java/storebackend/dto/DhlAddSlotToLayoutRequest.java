package storebackend.dto;

import lombok.Data;

/**
 * Request für das Hinzufügen eines existierenden Slots zum Layout
 * (Phase 3A.1 - Unplaced Slots)
 */
@Data
public class DhlAddSlotToLayoutRequest {
    private Long slotId;
    private Integer gridX;
    private Integer gridY;
    private Integer gridWidth;
    private Integer gridHeight;
    private Long zoneId;  // Optional - kann null sein
}
