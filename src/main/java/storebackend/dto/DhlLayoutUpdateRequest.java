package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request: Layout-Positionen batch-updaten (Drag&Drop)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlLayoutUpdateRequest {
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
