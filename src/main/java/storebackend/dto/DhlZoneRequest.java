package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
