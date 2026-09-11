package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/**
 * Antwort für GET /api/maritime/vessels/{mmsi}/events – kleine Historie + serverseitig aus den
 * Events abgeleitete Liegezeit-Ankerpunkte (Phase 2B). Die Dauer selbst ("Im Hafen seit 2h 34m")
 * wird bewusst im Frontend aus {@link #enteredAt}/{@link #mooredAt} berechnet (kein Sekundentakt-
 * Update in der DB), siehe Aufgabenstellung.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class VesselPortEventsResponse {
    private long mmsi;
    private List<VesselPortEventDTO> events;
    /** Beginn des aktuellen Hafenaufenthalts (letztes ENTERED_PORT ohne späteres LEFT_PORT), oder null. */
    private Instant enteredAt;
    /** Letztes MOORED-Event des aktuellen Aufenthalts (nach enteredAt), oder null. */
    private Instant mooredAt;
    /** Letztes LEFT_PORT-Event, falls das Schiff den Hafen zuletzt verlassen hat (dann kein aktueller Aufenthalt). */
    private Instant leftAt;
}
