package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.dto.VesselDTO;
import storebackend.dto.VesselPortEventDTO;
import storebackend.dto.VesselPortEventsResponse;
import storebackend.entity.VesselPortEvent;
import storebackend.enums.MaritimePort;
import storebackend.enums.PortEventType;
import storebackend.enums.VesselPortStatus;
import storebackend.repository.VesselPortEventRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Port Events (Phase 2B) – kleine, fachliche Historie von Statuswechseln pro Schiff.
 *
 * WICHTIG (Performance/VPS): Es wird NICHT jede AIS-Nachricht persistiert, sondern nur bei einem
 * echten Statuswechsel (siehe {@link #recordTransitionIfAny}) – aufgerufen aus
 * {@link AisStreamClientService#handlePositionReport}, welches den Vergleich alter/neuer
 * {@link VesselPortStatus} bereits durchführt. Kein neuer Executor/Thread-Pool, keine
 * unbounded Queue – ein einzelner, defensiver DB-Insert pro Transition.
 *
 * WICHTIG (synchron statt @Async, Hardening-Review): Dieser Aufruf erfolgt synchron auf dem
 * WebSocket-Callback-Thread (wsExecutor, 2 Threads). Das ist bewusst so belassen:
 *  - Events entstehen NUR bei echten Statuswechseln, nicht pro AIS-Message – realistisch wenige
 *    Events pro Schiff und Hafenaufenthalt (Größenordnung Minuten/Stunden auseinander), nicht im
 *    Sekundentakt wie PositionReports selbst.
 *  - Ein einzelner Insert einer schmalen Zeile auf der lokalen Postgres-Instanz liegt im
 *    Millisekundenbereich – vernachlässigbar gegenüber dem AIS-Nachrichtenintervall pro Schiff.
 *  - Das Projekt nutzt an anderer Stelle zwar {@code @Async} (siehe SecurityEventService), aber
 *    ohne konfigurierten {@code TaskExecutor}-Bean, d.h. Spring's Default-{@code SimpleAsyncTaskExecutor}
 *    (unbounded, ein neuer Thread pro Aufruf). Das hier zusätzlich einzuführen würde dem Ziel
 *    "keine neuen Thread-Pools/keine unbounded Ressourcen" eher schaden als nutzen, während der
 *    erwartete Nutzen (seltene, schnelle Inserts) gering ist. Sollte sich das Transitionsvolumen
 *    künftig als Problem erweisen, ist das bestehende {@code @Async}-Muster (ohne neuen Executor)
 *    der richtige nächste Schritt.
 */
@Service
@Slf4j
public class VesselPortEventService {

    /**
     * Minimales Cooldown-Fenster gegen Status-"Flattern" (z.B. MOORED -> IN_PORT -> MOORED durch
     * schwankende SOG/Position innerhalb weniger AIS-Messages). Verhindert unnötige Event-Ketten,
     * ohne eine eigene State Machine einzuführen – siehe {@link #recordTransitionIfAny}.
     */
    private static final Duration DEDUP_WINDOW = Duration.ofMinutes(5);

    /** Zustände "innerhalb der Port-Zone" – Grundlage für die Transition-Regeln (siehe Klassen-Javadoc PortEventType). */
    private static boolean isInZone(VesselPortStatus status) {
        return status == VesselPortStatus.IN_PORT
                || status == VesselPortStatus.MOORED
                || status == VesselPortStatus.DEPARTING;
    }

    private final VesselPortEventRepository repository;

    public VesselPortEventService(VesselPortEventRepository repository) {
        this.repository = repository;
    }

    /**
     * Leitet aus altem/neuem {@link VesselPortStatus} ab, ob ein fachliches Port Event vorliegt, und
     * persistiert es defensiv (ein DB-Fehler hier darf den AIS-Listener niemals crashen lassen).
     *
     * WICHTIG (Hardening-Review):
     *  - {@code previousStatus == null} bedeutet "erstmals in dieser Session/diesem Hafen gesehen"
     *    (frischer Cache-Eintrag nach Backend-Neustart, Portwechsel ODER echte Neuankunft) – das
     *    ist bewusst KEIN fachlicher Statuswechsel und erzeugt daher NIEMALS ein Event. Ohne diese
     *    Regel würde z.B. nach jedem Neustart für jedes bereits im Hafen liegende Schiff sofort ein
     *    "ENTERED_PORT"/"MOORED" erfunden, obwohl real keine Bewegung stattfand.
     *  - Zusätzlich zur In-Memory-Transitionserkennung (siehe AisStreamClientService, vergleicht
     *    Cache-Status vor/nach) wird defensiv der zuletzt gespeicherte Event-Typ desselben
     *    Schiffs+Hafens aus der DB geprüft: liegt ein identisches Event innerhalb von
     *    {@link #DEDUP_WINDOW} bereits vor, wird NICHT erneut gespeichert (Schutz gegen
     *    Status-Flattern und mögliche Doppel-Events, z.B. durch kurzzeitige Neustarts/Races).
     */
    public void recordTransitionIfAny(VesselPortStatus previousStatus, VesselPortStatus newStatus,
                                       MaritimePort port, VesselDTO vessel) {
        if (previousStatus == null || previousStatus == newStatus || newStatus == null) {
            return;
        }
        PortEventType eventType = mapTransition(previousStatus, newStatus);
        if (eventType == null) {
            return;
        }
        try {
            if (isDuplicateWithinCooldown(vessel.getMmsi(), port, eventType)) {
                log.debug("Skipping vessel port event (flatter/duplicate guard): mmsi={}, port={}, type={}",
                        vessel.getMmsi(), port, eventType);
                return;
            }
            VesselPortEvent event = new VesselPortEvent();
            event.setMmsi(vessel.getMmsi());
            event.setPort(port.name());
            event.setEventType(eventType);
            event.setEventTime(Instant.now());
            event.setLatitude(vessel.getLatitude());
            event.setLongitude(vessel.getLongitude());
            event.setSog(vessel.getSpeed());
            event.setShipName(vessel.getShipName());
            event.setDestination(vessel.getDestination());
            repository.save(event);
        } catch (Exception e) {
            // Defensiv: Port Events sind ein "Nice-to-have" für die Historie, dürfen aber niemals
            // den Live-AIS-Ingest destabilisieren (siehe Klassen-Javadoc AisStreamClientService).
            log.warn("Failed to persist vessel port event (mmsi={}, port={}, type={}): {}",
                    vessel.getMmsi(), port, eventType, e.getMessage());
        }
    }

    /**
     * Ein einzelner, indexgestützter Lookup (siehe idx_vessel_port_events_mmsi_time, V024) –
     * kein {@code findAll()}, kein Scan. Nur wenn dasselbe Event für dasselbe Schiff+Hafen bereits
     * innerhalb von {@link #DEDUP_WINDOW} existiert, gilt es als Duplikat/Flattern.
     */
    private boolean isDuplicateWithinCooldown(long mmsi, MaritimePort port, PortEventType eventType) {
        Optional<VesselPortEvent> lastEvent = repository.findFirstByMmsiAndPortOrderByEventTimeDesc(mmsi, port.name());
        if (lastEvent.isEmpty() || lastEvent.get().getEventType() != eventType) {
            return false;
        }
        Instant lastEventTime = lastEvent.get().getEventTime();
        return lastEventTime != null && Duration.between(lastEventTime, Instant.now()).compareTo(DEDUP_WINDOW) < 0;
    }

    /** MVP-Regeln für Statuswechsel -> Event, siehe {@link PortEventType} Javadoc für Details. */
    private PortEventType mapTransition(VesselPortStatus previous, VesselPortStatus current) {
        boolean prevInZone = isInZone(previous);
        return switch (current) {
            case APPROACHING -> prevInZone ? null : PortEventType.APPROACHING;
            case IN_PORT -> prevInZone ? null : PortEventType.ENTERED_PORT;
            case MOORED -> PortEventType.MOORED;
            case DEPARTING -> prevInZone ? PortEventType.DEPARTING : null;
            case NEAR_PORT, UNKNOWN -> prevInZone ? PortEventType.LEFT_PORT : null;
        };
    }

    /** Letzte Events eines Schiffs (Vessel-Detail) inkl. serverseitig abgeleiteter Liegezeit-Ankerpunkte. */
    public VesselPortEventsResponse getVesselEventsResponse(long mmsi) {
        List<VesselPortEvent> events = repository.findTop50ByMmsiOrderByEventTimeDesc(mmsi);

        Instant enteredAt = null;
        Instant mooredAt = null;
        Instant leftAt = null;
        for (VesselPortEvent e : events) {
            if (e.getEventType() == PortEventType.LEFT_PORT) {
                leftAt = e.getEventTime();
                break;
            }
            if (e.getEventType() == PortEventType.MOORED && mooredAt == null) {
                mooredAt = e.getEventTime();
            }
            if (e.getEventType() == PortEventType.ENTERED_PORT) {
                enteredAt = e.getEventTime();
                break;
            }
        }

        List<VesselPortEventDTO> dtos = events.stream().map(this::toDto).toList();
        return VesselPortEventsResponse.builder()
                .mmsi(mmsi)
                .events(dtos)
                .enteredAt(enteredAt)
                .mooredAt(mooredAt)
                .leftAt(leftAt)
                .build();
    }

    /** "Letzte Hafenereignisse" für den ausgewählten Hafen (kleine Anzahl, siehe Repository). */
    public List<VesselPortEventDTO> getRecentEventsForPort(MaritimePort port) {
        return repository.findTop20ByPortOrderByEventTimeDesc(port.name()).stream().map(this::toDto).toList();
    }

    private VesselPortEventDTO toDto(VesselPortEvent e) {
        return VesselPortEventDTO.builder()
                .mmsi(e.getMmsi())
                .port(e.getPort())
                .eventType(e.getEventType().name())
                .eventTime(e.getEventTime())
                .latitude(e.getLatitude())
                .longitude(e.getLongitude())
                .sog(e.getSog())
                .shipName(e.getShipName())
                .destination(e.getDestination())
                .build();
    }
}
