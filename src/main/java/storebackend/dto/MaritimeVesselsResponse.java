package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/**
 * Response für GET /api/maritime/vessels – Status + aktuelle Schiffsliste
 * (Tanger Med MVP). Enthält bewusst nur den aktuellen Live-Zustand pro
 * Schiff, keine Historie (siehe {@link storebackend.service.AisStreamClientService}).
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class MaritimeVesselsResponse {
    private boolean connected;
    private boolean configured;
    private Instant lastMessageAt;
    private int vesselCount;
    private List<VesselDTO> vessels;
}
