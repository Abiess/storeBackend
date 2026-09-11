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

import java.util.Optional;

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
 * Deckt die in der Aufgabenstellung genannten Beispiel-Transitionen ab sowie die beiden
 * Hardening-Regeln aus dem Review: previousStatus == null erzeugt niemals ein Event
 * (Neustart/Portwechsel/Erstsichtung), und identischer Status erzeugt kein Event.
 */
class VesselPortEventServiceTest {

    @Mock
    private VesselPortEventRepository repository;

    private VesselPortEventService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // Kein bereits existierendes Event -> Flatter-/Duplikat-Schutz greift in diesen Tests nicht.
        when(repository.findFirstByMmsiAndPortOrderByEventTimeDesc(anyLong(), anyString())).thenReturn(Optional.empty());
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

    @Test
    void nearPortToApproaching_createsApproachingEvent() {
        service.recordTransitionIfAny(VesselPortStatus.NEAR_PORT, VesselPortStatus.APPROACHING, MaritimePort.TANGER_MED, vessel());
        verify(repository, times(1)).save(argThatType(PortEventType.APPROACHING));
    }

    @Test
    void approachingToInPort_createsEnteredPortEvent() {
        service.recordTransitionIfAny(VesselPortStatus.APPROACHING, VesselPortStatus.IN_PORT, MaritimePort.TANGER_MED, vessel());
        verify(repository, times(1)).save(argThatType(PortEventType.ENTERED_PORT));
    }

    @Test
    void inPortToMoored_createsMooredEvent() {
        service.recordTransitionIfAny(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED, MaritimePort.TANGER_MED, vessel());
        verify(repository, times(1)).save(argThatType(PortEventType.MOORED));
    }

    @Test
    void mooredToDeparting_createsDepartingEvent() {
        service.recordTransitionIfAny(VesselPortStatus.MOORED, VesselPortStatus.DEPARTING, MaritimePort.TANGER_MED, vessel());
        verify(repository, times(1)).save(argThatType(PortEventType.DEPARTING));
    }

    @Test
    void departingToNearPort_createsLeftPortEvent() {
        service.recordTransitionIfAny(VesselPortStatus.DEPARTING, VesselPortStatus.NEAR_PORT, MaritimePort.TANGER_MED, vessel());
        verify(repository, times(1)).save(argThatType(PortEventType.LEFT_PORT));
    }

    @Test
    void departingToUnknown_createsLeftPortEvent() {
        service.recordTransitionIfAny(VesselPortStatus.DEPARTING, VesselPortStatus.UNKNOWN, MaritimePort.TANGER_MED, vessel());
        verify(repository, times(1)).save(argThatType(PortEventType.LEFT_PORT));
    }

    @Test
    void sameStatus_neverCreatesEvent() {
        service.recordTransitionIfAny(VesselPortStatus.MOORED, VesselPortStatus.MOORED, MaritimePort.TANGER_MED, vessel());
        verify(repository, never()).save(any());
    }

    @Test
    void previousStatusNull_neverCreatesEvent() {
        // Neustart/Portwechsel/Erstsichtung – previousStatus==null darf NIE als fachlicher
        // Statuswechsel interpretiert werden (siehe Hardening-Review Punkt 2/6).
        service.recordTransitionIfAny(null, VesselPortStatus.MOORED, MaritimePort.TANGER_MED, vessel());
        service.recordTransitionIfAny(null, VesselPortStatus.IN_PORT, MaritimePort.TANGER_MED, vessel());
        service.recordTransitionIfAny(null, VesselPortStatus.APPROACHING, MaritimePort.TANGER_MED, vessel());
        verify(repository, never()).save(any());
    }

    @Test
    void mooredInPortMoored_flatteringWithinCooldown_doesNotDuplicate() {
        // MOORED -> IN_PORT erzeugt kein Event (prevInZone), IN_PORT -> MOORED würde ein zweites
        // MOORED-Event erzeugen - hier simulieren wir, dass bereits ein MOORED-Event vor Kurzem
        // gespeichert wurde (Flatter-Schutz muss das zweite unterdrücken).
        when(repository.findFirstByMmsiAndPortOrderByEventTimeDesc(anyLong(), anyString()))
                .thenReturn(Optional.of(recentMooredEvent()));

        service.recordTransitionIfAny(VesselPortStatus.IN_PORT, VesselPortStatus.MOORED, MaritimePort.TANGER_MED, vessel());

        verify(repository, never()).save(any());
    }

    private VesselPortEvent recentMooredEvent() {
        VesselPortEvent event = new VesselPortEvent();
        event.setMmsi(123456789L);
        event.setPort(MaritimePort.TANGER_MED.name());
        event.setEventType(PortEventType.MOORED);
        event.setEventTime(java.time.Instant.now().minusSeconds(30));
        return event;
    }

    /** Kleiner Helfer: matcht ein gespeichertes VesselPortEvent anhand seines eventType. */
    private VesselPortEvent argThatType(PortEventType expected) {
        return org.mockito.ArgumentMatchers.argThat(event -> event != null && event.getEventType() == expected);
    }
}
