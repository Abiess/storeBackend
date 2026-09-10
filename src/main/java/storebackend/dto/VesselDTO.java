package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Aktueller Live-Zustand eines AIS-Schiffs (Maritime-Feature, MVP: Tanger Med).
 *
 * WICHTIG: Es wird bewusst KEINE Historie gehalten – jede neue AIS-Position
 * überschreibt den vorherigen Zustand desselben Schiffes (Key = MMSI) im
 * {@link storebackend.service.AisStreamClientService} Vessel-Cache.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class VesselDTO {
    /** Maritime Mobile Service Identity – eindeutige Schiffs-ID, Cache-Key */
    private long mmsi;
    private String shipName;
    private double latitude;
    private double longitude;
    /** Speed Over Ground in Knoten */
    private Double speed;
    /** Course Over Ground in Grad */
    private Double course;
    /** True Heading in Grad (511 = nicht verfügbar, wird in der Mapping-Logik gefiltert) */
    private Integer heading;
    private Instant lastSeen;

    // Optional – nur befüllt, wenn aus ShipStaticData/StaticDataReport verfügbar
    private String callSign;
    private Long imo;
    private Integer shipType;
    private String destination;
    private Double draught;
}
