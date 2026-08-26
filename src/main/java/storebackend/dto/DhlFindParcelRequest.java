package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request: Paket suchen
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlFindParcelRequest {
    /**
     * Roher Tracking-Code (wird serverseitig normalisiert)
     */
    private String trackingCode;
}
