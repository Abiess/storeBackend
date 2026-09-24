package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.DhlFindParcelRequest;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.ParcelNotFoundException;
import storebackend.service.DhlActivityLogService;
import storebackend.service.DhlParcelService;
import storebackend.service.dhl.DhlTrackingClient;
import storebackend.util.StoreAccessChecker;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Controller - POST /parcels/find Fehlerhandling.
 *
 * Deckt die 4 vom Fachbereich geforderten Szenarien ab, wenn DHL eine
 * Sendung bestätigt, aber lokal (findParcel()/ACTIVE_PARCEL_STATUSES) kein
 * aktueller Einlagerungseintrag existiert bzw. wenn ein aktueller
 * Einlagerungseintrag existiert:
 * - lokal nicht vorhanden, keine Historie (DHL-Status wird NICHT vom
 *   Backend bewertet - das entscheidet ausschließlich das Frontend anhand
 *   der bereits vorhandenen /tracking/validate-Felder standardEventCode /
 *   shipmentStatus, siehe dhl-pickup-parcel.component.ts)
 * - lokal nicht vorhanden, aber CANCELLED-Historie vorhanden
 * - lokal STORED
 * - lokal PICKED_UP
 */
@ExtendWith(MockitoExtension.class)
class DhlControllerFindParcelTest {

    @Mock
    private DhlParcelService parcelService;

    @Mock
    private DhlActivityLogService activityLogService;

    @Mock
    private StoreAccessChecker storeAccessChecker;

    @Mock
    private DhlTrackingClient dhlTrackingClient;

    private DhlController dhlController;

    private User mockUser;

    @BeforeEach
    void setUp() {
        dhlController = new DhlController(
            parcelService,
            activityLogService,
            storeAccessChecker,
            dhlTrackingClient
        );

        mockUser = new User();
        mockUser.setId(123L);
        mockUser.setEmail("test@example.com");
    }

    private DhlFindParcelRequest findRequest(String trackingCode) {
        DhlFindParcelRequest request = new DhlFindParcelRequest();
        request.setTrackingCode(trackingCode);
        return request;
    }

    private Store storeWithId(Long storeId) {
        Store store = new Store();
        store.setId(storeId);
        return store;
    }

    private DhlParcel parcelWithStatus(Long storeId, String trackingCode, DhlParcelStatus status) {
        DhlParcel parcel = new DhlParcel();
        parcel.setId(1L);
        parcel.setStore(storeWithId(storeId));
        parcel.setTrackingCode(trackingCode);
        parcel.setShelfLocation("A1");
        parcel.setStatus(status);
        return parcel;
    }

    // ════════════════════════════════════════════════════════════════════
    // Szenario 1: lokal nicht vorhanden, keine Historie
    // (DHL-Status "aktiv" vs. "bereits abgeschlossen" wird bewusst NICHT
    // hier unterschieden - dafür gibt es keine Eingabe an diesem Endpoint;
    // diese Unterscheidung erfolgt im Frontend anhand bereits vorhandener
    // /tracking/validate-Felder, siehe dhl-pickup-parcel.component.spec.ts)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testFindParcel_NotStoredNoHistory_ThrowsParcelNotFoundWithoutHistoricalStatus() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        when(parcelService.normalizeTrackingCode(trackingCode)).thenReturn(trackingCode);
        when(parcelService.findParcel(storeId, trackingCode)).thenReturn(Optional.empty());
        when(parcelService.findMostRecentParcelIncludingHistory(storeId, trackingCode)).thenReturn(Optional.empty());

        ParcelNotFoundException ex = assertThrows(ParcelNotFoundException.class,
            () -> dhlController.findParcel(storeId, findRequest(trackingCode), mockUser));

        assertEquals("PARCEL_NOT_FOUND", ex.getCode());
        assertFalse(ex.getDetails().containsKey("historicalStatus"));
    }

    // ════════════════════════════════════════════════════════════════════
    // Szenario 2: lokal nicht vorhanden, aber CANCELLED-Historie vorhanden
    // → 404 bleibt (kein aktiver Bestand), aber die Antwort wird mit den
    // vorhandenen Stornierungsdaten angereichert statt "nie eingelagert"
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testFindParcel_NotStoredWithCancelledHistory_EnrichesExceptionDetails() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        when(parcelService.normalizeTrackingCode(trackingCode)).thenReturn(trackingCode);
        when(parcelService.findParcel(storeId, trackingCode)).thenReturn(Optional.empty());

        DhlParcel cancelled = parcelWithStatus(storeId, trackingCode, DhlParcelStatus.CANCELLED);
        cancelled.setCancelledAt(LocalDateTime.of(2026, 9, 1, 10, 0));
        cancelled.setCancellationReason("LOST");
        when(parcelService.findMostRecentParcelIncludingHistory(storeId, trackingCode))
            .thenReturn(Optional.of(cancelled));

        ParcelNotFoundException ex = assertThrows(ParcelNotFoundException.class,
            () -> dhlController.findParcel(storeId, findRequest(trackingCode), mockUser));

        assertEquals("PARCEL_NOT_FOUND", ex.getCode());
        assertEquals("CANCELLED", ex.getDetails().get("historicalStatus"));
        assertEquals("LOST", ex.getDetails().get("cancellationReason"));
        assertNotNull(ex.getDetails().get("cancelledAt"));
    }

    // ════════════════════════════════════════════════════════════════════
    // Szenario 3: lokal STORED → normale Antwort, unverändertes Verhalten
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testFindParcel_LocallyStored_ReturnsOk() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlParcel stored = parcelWithStatus(storeId, trackingCode, DhlParcelStatus.STORED);
        when(parcelService.findParcel(storeId, trackingCode)).thenReturn(Optional.of(stored));

        var response = dhlController.findParcel(storeId, findRequest(trackingCode), mockUser);

        assertEquals(200, response.getStatusCode().value());
        verify(parcelService, never()).findMostRecentParcelIncludingHistory(anyLong(), anyString());
    }

    // ════════════════════════════════════════════════════════════════════
    // Szenario 4: lokal PICKED_UP → normale Antwort (Frontend zeigt
    // bestehenden Abholzeitpunkt/Status statt erneuter Abholung)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testFindParcel_LocallyPickedUp_ReturnsOk() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlParcel pickedUp = parcelWithStatus(storeId, trackingCode, DhlParcelStatus.PICKED_UP);
        pickedUp.setPickedUpAt(LocalDateTime.of(2026, 9, 2, 9, 30));
        when(parcelService.findParcel(storeId, trackingCode)).thenReturn(Optional.of(pickedUp));

        var response = dhlController.findParcel(storeId, findRequest(trackingCode), mockUser);

        assertEquals(200, response.getStatusCode().value());
        verify(parcelService, never()).findMostRecentParcelIncludingHistory(anyLong(), anyString());
    }
}
