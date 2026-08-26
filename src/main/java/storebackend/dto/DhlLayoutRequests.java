package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request: Zone erstellen/aktualisieren
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlZoneRequest {
    private String name;
    private String color;
    private Integer sortOrder;
}

/**
 * Request: Layout-Positionen batch-updaten (Drag&Drop)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
class DhlLayoutUpdateRequest {
    private List<LayoutPositionUpdate> updates;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LayoutPositionUpdate {
        private Long slotId;
        private Integer gridX;
        private Integer gridY;
        private Integer gridWidth;
        private Integer gridHeight;
        private Long zoneId; // nullable
    }
}

/**
 * Request: Neuen Slot mit Layout erstellen
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
class DhlCreateSlotWithLayoutRequest {
    private String code;
    private Integer capacity;
    private String description;
    private Integer gridX;
    private Integer gridY;
    private Integer gridWidth;
    private Integer gridHeight;
    private Long zoneId; // nullable
}
