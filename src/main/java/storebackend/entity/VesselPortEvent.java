package storebackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PortEventType;

import java.time.Instant;

/**
 * Port Event (Phase 2B) – ein fachlicher Statuswechsel eines Schiffs relativ zu einem Hafen.
 *
 * WICHTIG: KEINE AIS-Rohmessage-Historie, KEINE Positionshistorie im Sekundentakt – ein Eintrag
 * entsteht ausschließlich bei einem echten Statuswechsel (siehe
 * {@link storebackend.service.VesselPortEventService}). Global (kein Store-Bezug, kein
 * Multi-Tenant-Feld), analog zum restlichen Maritime-Feature.
 */
@Entity
@Table(name = "vessel_port_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VesselPortEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Maritime Mobile Service Identity – Schiffs-ID (identisch zu VesselDTO.mmsi). */
    @Column(name = "mmsi", nullable = false)
    private Long mmsi;

    /** Name des Hafens ({@link storebackend.enums.MaritimePort}), zum Zeitpunkt des Events aktiv ausgewählt. */
    @Column(name = "port", nullable = false, length = 30)
    private String port;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 20)
    private PortEventType eventType;

    @Column(name = "event_time", nullable = false)
    private Instant eventTime;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    /** Speed Over Ground in Knoten zum Zeitpunkt des Events. */
    @Column(name = "sog")
    private Double sog;

    @Column(name = "ship_name", length = 100)
    private String shipName;

    @Column(name = "destination", length = 150)
    private String destination;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
