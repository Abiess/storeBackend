package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request: Neuen Slot mit Layout erstellen
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlCreateSlotWithLayoutRequest {
    private String code;
    private Integer capacity;
    private String description;
    private Integer gridX;
    private Integer gridY;
    private Integer gridWidth;
    private Integer gridHeight;
    private Long zoneId; // nullable
}
