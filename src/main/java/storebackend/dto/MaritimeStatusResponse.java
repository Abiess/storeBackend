package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Leichtgewichtiger Status der AISStream-Integration (ohne Vessel-Liste).
 * Für GET /api/maritime/status – z. B. für ein reines Status-Widget.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class MaritimeStatusResponse {
    /** true = aktive WebSocket-Verbindung zu AISStream */
    private boolean connected;
    /** true = AISSTREAM_API_KEY ist konfiguriert (unabhängig vom aktuellen Verbindungsstatus) */
    private boolean configured;
    private Instant lastMessageAt;
    private int vesselCount;
}
