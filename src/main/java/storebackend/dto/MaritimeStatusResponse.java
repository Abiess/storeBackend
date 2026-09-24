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
    /**
     * true = verbunden UND die Subscription für den aktuell ausgewählten Hafen wurde bereits von
     * AISStream per SubscriptionConfirmation bestätigt (siehe AisStreamClientService#isHealthy()).
     */
    private boolean healthy;
    /** Aktuell ausgewählter Hafen, z. B. "TANGER_MED" (siehe {@link storebackend.enums.MaritimePort}) */
    private String selectedPort;
    private Instant lastMessageAt;
    private int vesselCount;
}
