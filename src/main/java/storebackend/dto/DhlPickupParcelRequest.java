package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request: Paket abholen
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlPickupParcelRequest {
    /**
     * Roher Tracking-Code (wird serverseitig normalisiert)
     */
    private String trackingCode;
}
