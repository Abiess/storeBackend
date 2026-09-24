package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Eintrag für GET /api/maritime/ports – Liste der unterstützten Häfen.
 *
 * Phase 3A (Live Map): zusätzlich zu id/name werden die bereits im Backend als Source-of-Truth
 * vorhandenen Geometrien aus {@link storebackend.enums.MaritimePort} read-only mitgegeben, damit
 * das Frontend Zentrum/Zonen NICHT unabhängig hardcoden muss. Rein deskriptive Zusatzfelder,
 * keine neue Logik/DB – siehe MaritimeController#getPorts.
 */
@Getter
@AllArgsConstructor
public class MaritimePortDto {
    private String id;
    private String name;
    /** Hafenzentrum {lat, lon} – siehe MaritimePort#getCenter. */
    private double[] center;
    /** Enge interne Port-Zone (Hafenbecken), Format {{minLat,minLon},{maxLat,maxLon}} – siehe MaritimePort#getPortZoneBox. */
    private double[][] portZoneBox;
    /** Mittelgroße Anfahrtszone um den Hafen – siehe MaritimePort#getApproachZone. */
    private double[][] approachZone;
}
