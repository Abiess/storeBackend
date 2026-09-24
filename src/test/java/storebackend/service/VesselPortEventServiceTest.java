package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import storebackend.dto.VesselDTO;
import storebackend.entity.VesselPortEvent;
import storebackend.enums.MaritimePort;
import storebackend.enums.PortEventType;
import storebackend.enums.VesselPortStatus;
import storebackend.repository.VesselPortEventRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test für die Transition-Regeln von {@link VesselPortEventService} (Phase 2B: Port Events).
 *
 * Deckt die in der Aufgabenstellung genannten Beispiel-Transitionen ab sowie die Hardening-Regeln
 * aus dem Review: previousStatus == null erzeugt niemals ein Event (Neustart/Portwechsel/
 * Erstsichtung), identischer Status erzeugt kein Event, und - Kern dieses Fixes - die
 * sequenzbasierte (NICHT mehr zeitbasierte) Dedup-Regel gegen doppelte/flatternde Events (siehe
 * Klassen-Javadoc {@link VesselPortEventService#recordTransitionIfAny}, produktiv beobachtet bei
 * "DALIA"/"VB AMSA").
 *
 * WICHTIG (Fake statt reinem Mock für die Szenario-Tests A-E): {@link #repository} wird so
 * gestubbt, dass {@code save(...)} die Events tatsächlich in einer Liste sammelt und
 * {@code findFirstByMmsiAndPortOrderByEventTimeDesc(...)} das jeweils ZULETZT gespeicherte Event
 * dieser Liste zurückgibt - damit lässt sich eine realistische Abfolge mehrerer
 * {@code recordTransitionIfAny}-Aufrufe (wie sie AIS-Flattern erzeugen würde) end-to-end testen,
 * ohne eine echte Datenbank zu benötigen.
 */
class VesselPortEventServiceTest {

    @Mock
    private VesselPortEventRepository repository;

    private VesselPortEventService service;

    /** Chronologisch gespeicherte Events dieses Tests (Fake-Persistenz, siehe Klassen-Javadoc). */
    private List<VesselPortEvent> savedEvents;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        savedEvents = new ArrayList<>();
        when(repository.save(any(VesselPortEvent.class))).thenAnswer(invocation -> {
            VesselPortEvent event = invocation.getArgument(0);
            savedEvents.add(event);
            return event;
        });
        // Standard: "letztes persistiertes Event" ist das zuletzt in savedEvents gelandete - reflektiert
        // real das Verhalten von findFirstByMmsiAndPortOrderByEventTimeDesc (neueste zuerst).
        when(repository.findFirstByMmsiAndPortOrderByEventTimeDesc(anyLong(), anyString()))
                .thenAnswer(invocation -> savedEvents.isEmpty()
                        ? Optional.empty()
                        : Optional.of(savedEvents.get(savedEvents.size() - 1)));
        service = new VesselPortEventService(repository);
    }

    private VesselDTO vessel() {
        return VesselDTO.builder()
                .mmsi(123456789L)
                .shipName("Test Vessel")
                .latitude(35.89)
                .longitude(-5.41)
                .speed(2.0)
                .build();
    }

    private void transition(VesselPortStatus previous, VesselPortStatus current) {
        service.recordTransitionIfAny(previous, current, MaritimePort.TANGER_MED, vessel());
    }

    // ─── Einzelne Transition-Regeln (unverändert) ──────────────────────────────

    @Test
    void nearPortToApproaching_createsApproachingEvent() {
        transition(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING);
        verify(repository, times(1)).save(argThatType(PortEventType.APPROACHING));
    }

    @Test
    void approachingToInPort_createsEnteredPortEvent() {
        transition(VesselPortStatus.APPROACHING, VesselPortStatus.IN_PORT);
        verify(repository, times(1)).save(argThatType(PortEventType.ENTERED_PORT));
    }

    @Test
    void inPortToMoored_createsMooredEvent() {
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);
        verify(repository, times(1)).save(argThatType(PortEventType.MOORED));
    }

    @Test
    void mooredToDeparting_createsDepartingEvent() {
        transition(VesselPortStatus.MOORED, VesselPortStatus.DEPARTING);
        verify(repository, times(1)).save(argThatType(PortEventType.DEPARTING));
    }

    @Test
    void departingToNearPort_createsLeftPortEvent() {
        transition(VesselPortStatus.DEPARTING, VesselPortStatus.NEAR_PORT);
        verify(repository, times(1)).save(argThatType(PortEventType.LEFT_PORT));
    }

    @Test
    void departingToUnknown_createsLeftPortEvent() {
        transition(VesselPortStatus.DEPARTING, VesselPortStatus.UNKNOWN);
        verify(repository, times(1)).save(argThatType(PortEventType.LEFT_PORT));
    }

    @Test
    void sameStatus_neverCreatesEvent() {
        transition(VesselPortStatus.MOORED, VesselPortStatus.MOORED);
        verify(repository, never()).save(any());
    }

    @Test
    void previousStatusNull_neverCreatesEvent() {
        // Neustart/Portwechsel/Erstsichtung – previousStatus==null darf NIE als fachlicher
        // Statuswechsel interpretiert werden (siehe Hardening-Review Punkt 2/6).
        transition(null, VesselPortStatus.MOORED);
        transition(null, VesselPortStatus.IN_PORT);
        transition(null, VesselPortStatus.APPROACHING);
        verify(repository, never()).save(any());
    }

    // ─── Szenario A: wiederholtes APPROACHING (mit Zonen-Flattern) => genau EIN Event ──────────

    @Test
    void scenarioA_repeatedApproaching_createsExactlyOneApproachingEvent() {
        transition(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING);   // #1: neu -> gespeichert
        transition(VesselPortStatus.APPROACHING, VesselPortStatus.NEAR_PORT);   // Zonen-Flattern, kein Event (siehe mapTransition)
        transition(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING);   // erneutes APPROACHING -> Duplikat, verworfen

        assertEquals(1, savedEvents.size());
        assertEquals(PortEventType.APPROACHING, savedEvents.get(0).getEventType());
    }

    // ─── Szenario B: ENTERED_PORT + mehrfaches MOORED (mit IN_PORT-Flattern) => ENTERED_PORT + 1x MOORED ──────────

    @Test
    void scenarioB_enteredPortThenRepeatedMoored_createsEnteredPortAndExactlyOneMoored() {
        transition(VesselPortStatus.APPROACHING, VesselPortStatus.IN_PORT);   // ENTERED_PORT
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);        // MOORED #1
        transition(VesselPortStatus.MOORED, VesselPortStatus.IN_PORT);        // Flattern zurück, kein Event
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);        // MOORED erneut -> Duplikat, verworfen
        transition(VesselPortStatus.MOORED, VesselPortStatus.IN_PORT);        // Flattern zurück, kein Event
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);        // MOORED erneut -> Duplikat, verworfen

        assertEquals(2, savedEvents.size());
        assertEquals(PortEventType.ENTERED_PORT, savedEvents.get(0).getEventType());
        assertEquals(PortEventType.MOORED, savedEvents.get(1).getEventType());
    }

    // ─── Szenario C: vollständiger Lebenszyklus => alle 5 Events genau einmal, in Reihenfolge ──────────

    @Test
    void scenarioC_fullLifecycle_createsAllFiveEventsExactlyOnceInOrder() {
        transition(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING);
        transition(VesselPortStatus.APPROACHING, VesselPortStatus.IN_PORT);
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);
        transition(VesselPortStatus.MOORED, VesselPortStatus.DEPARTING);
        transition(VesselPortStatus.DEPARTING, VesselPortStatus.NEAR_PORT);

        assertEquals(5, savedEvents.size());
        assertEquals(PortEventType.APPROACHING, savedEvents.get(0).getEventType());
        assertEquals(PortEventType.ENTERED_PORT, savedEvents.get(1).getEventType());
        assertEquals(PortEventType.MOORED, savedEvents.get(2).getEventType());
        assertEquals(PortEventType.DEPARTING, savedEvents.get(3).getEventType());
        assertEquals(PortEventType.LEFT_PORT, savedEvents.get(4).getEventType());
    }

    // ─── Szenario D: zweiter, echter Hafenbesuch nach vollständigem ersten Zyklus bleibt erhalten ──────────

    @Test
    void scenarioD_secondGenuinePortVisitAfterFullCycle_isPreservedNotDeduplicated() {
        // Erster vollständiger Besuch.
        transition(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING);
        transition(VesselPortStatus.APPROACHING, VesselPortStatus.IN_PORT);
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);
        transition(VesselPortStatus.MOORED, VesselPortStatus.DEPARTING);
        transition(VesselPortStatus.DEPARTING, VesselPortStatus.NEAR_PORT);
        assertEquals(5, savedEvents.size());

        // Zweiter, echter Besuch – trotz identischer Event-Typen wie beim ersten Besuch dürfen diese
        // NICHT als Duplikate verworfen werden, weil dazwischen LEFT_PORT/DEPARTING/ENTERED_PORT lagen.
        transition(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING);
        transition(VesselPortStatus.APPROACHING, VesselPortStatus.IN_PORT);
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);

        assertEquals(8, savedEvents.size());
        assertEquals(PortEventType.APPROACHING, savedEvents.get(5).getEventType());
        assertEquals(PortEventType.ENTERED_PORT, savedEvents.get(6).getEventType());
        assertEquals(PortEventType.MOORED, savedEvents.get(7).getEventType());
    }

    // ─── Szenario E: MOORED -> kurzer falscher Status -> MOORED => kein Doppel-Event ──────────

    @Test
    void scenarioE_mooredThenBriefFlapThenMooredAgain_doesNotDuplicate() {
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED); // #1: gespeichert
        transition(VesselPortStatus.MOORED, VesselPortStatus.IN_PORT); // kurzes Flattern, kein Event
        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED); // Duplikat -> verworfen

        assertEquals(1, savedEvents.size());
    }

    /**
     * BUGFIX-Regressionstest: die frühere zeitbasierte Cooldown-Logik (5 Minuten) hätte ein zweites
     * MOORED-Event trotzdem gespeichert, sobald zwischen den beiden MOORED-Ableitungen mehr als
     * 5 Minuten liegen (in Produktion realistisch bei langsamem AIS-Traffic, siehe "DALIA"/"VB AMSA").
     * Die neue, sequenzbasierte Regel dedupliziert unabhängig vom Zeitabstand, solange kein
     * fachlich unterschiedliches Zwischen-Event vorliegt.
     */
    @Test
    void mooredDuplicate_isSuppressedEvenLongAfterThePreviousMooredEvent() {
        when(repository.findFirstByMmsiAndPortOrderByEventTimeDesc(anyLong(), anyString()))
                .thenReturn(Optional.of(oldMooredEvent()));

        transition(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED);

        verify(repository, never()).save(any());
    }

    private VesselPortEvent oldMooredEvent() {
        VesselPortEvent event = new VesselPortEvent();
        event.setMmsi(123456789L);
        event.setPort(MaritimePort.TANGER_MED.name());
        event.setEventType(PortEventType.MOORED);
        event.setEventTime(Instant.now().minusSeconds(60 * 60 * 6)); // 6 Stunden alt, bewusst außerhalb jedes Zeitfensters
        return event;
    }

    /** Kleiner Helfer: matcht ein gespeichertes VesselPortEvent anhand seines eventType. */
    private VesselPortEvent argThatType(PortEventType expected) {
        return org.mockito.ArgumentMatchers.argThat(event -> event != null && event.getEventType() == expected);
    }
}
