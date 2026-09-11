package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.VesselPortEvent;

import java.util.List;
import java.util.Optional;

/**
 * Repository für {@link VesselPortEvent} (Phase 2B: Port Events / kleine Historie).
 *
 * Bewusst nur begrenzte, absteigend sortierte Abfragen ("Top N") – kein {@code findAll()}
 * auf dieser potenziell wachsenden Tabelle (siehe Performance-Vorgaben).
 */
public interface VesselPortEventRepository extends JpaRepository<VesselPortEvent, Long> {

    /** Historie eines einzelnen Schiffs (Vessel-Detail), neueste zuerst. */
    List<VesselPortEvent> findTop50ByMmsiOrderByEventTimeDesc(Long mmsi);

    /** "Letzte Hafenereignisse" für den ausgewählten Hafen, neueste zuerst. */
    List<VesselPortEvent> findTop20ByPortOrderByEventTimeDesc(String port);

    /**
     * Letztes Event für ein Schiff in einem Hafen – Grundlage für den Flatter-/Duplikat-Schutz in
     * {@link storebackend.service.VesselPortEventService#recordTransitionIfAny}. Einzelner,
     * indexgestützter Lookup (idx_vessel_port_events_mmsi_time, V024), kein Scan.
     */
    Optional<VesselPortEvent> findFirstByMmsiAndPortOrderByEventTimeDesc(Long mmsi, String port);
}
