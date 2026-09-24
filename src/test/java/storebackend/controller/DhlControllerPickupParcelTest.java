package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import storebackend.dto.DhlPickupParcelRequest;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.ParcelAlreadyPickedUpException;
import storebackend.exception.ParcelNotFoundException;
import storebackend.service.DhlActivityLogService;
import storebackend.service.DhlParcelService;
import storebackend.service.dhl.DhlTrackingClient;
import storebackend.util.StoreAccessChecker;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Controller - Pickup Parcel Endpoint Tests
 *
 * Seit der Entfernung der redundanten DHL-Neuvalidierung bei der Abholung
 * (siehe Klassendoku von DhlController.pickupParcel()) ruft der Endpoint
 * NIEMALS die externe DHL-API auf ({@link DhlTrackingClient} wird hier NUR
 * noch injiziert, weil andere Endpunkte desselben Controllers ihn brauchen -
 * für /parcels/pickup bleibt er komplett unbenutzt). Die Fachlogik
 * (gefunden/bereits abgeholt/nicht gefunden) liegt vollständig bei
 * {@link DhlParcelService#pickupParcel(Long, String)} (atomares, lokales
 * UPDATE) - dieser Test stubbt daher ausschließlich {@link DhlParcelService}.
 */
@ExtendWith(MockitoExtension.class)
class DhlControllerPickupParcelTest {

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

    private DhlPickupParcelRequest pickupRequest(String trackingCode) {
        DhlPickupParcelRequest request = new DhlPickupParcelRequest();
        request.setTrackingCode(trackingCode);
        return request;
    }

    private Store storeWithId(Long storeId) {
        Store store = new Store();
        store.setId(storeId);
        return store;
    }

    // ════════════════════════════════════════════════════════════════════
    // Erfolgreiche Abholung: rein lokaler Aufruf, KEIN DHL-API-Call
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_Success_NeverCallsDhl() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlParcel pickedUp = new DhlParcel();
        pickedUp.setId(1L);
        pickedUp.setStore(storeWithId(storeId));
        pickedUp.setTrackingCode(trackingCode);
        pickedUp.setShelfLocation("A1");
        pickedUp.setStatus(DhlParcelStatus.PICKED_UP);
        when(parcelService.pickupParcel(storeId, trackingCode)).thenReturn(pickedUp);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(parcelService).pickupParcel(storeId, trackingCode);
        verifyNoInteractions(dhlTrackingClient);
    }

    // ════════════════════════════════════════════════════════════════════
    // Nicht gefundenes Paket → 404, kein DHL-Call
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_ParcelNotFound_ReturnsWithoutCallingDhl() {
        Long storeId = 1L;
        String trackingCode = "UNKNOWN0000000000000";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        when(parcelService.pickupParcel(storeId, trackingCode))
            .thenThrow(new ParcelNotFoundException(trackingCode));

        assertThrows(ParcelNotFoundException.class,
            () -> dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser));

        verify(parcelService).pickupParcel(storeId, trackingCode);
        verifyNoInteractions(dhlTrackingClient);
    }

    // ════════════════════════════════════════════════════════════════════
    // Bereits abgeholtes Paket → 409, kein DHL-Call (auch nicht bei einem
    // zweiten, nahezu gleichzeitigen Abholversuch - das atomare UPDATE in
    // DhlParcelService entscheidet, nicht der Controller)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_AlreadyPickedUp_ReturnsWithoutCallingDhl() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        when(parcelService.pickupParcel(storeId, trackingCode))
            .thenThrow(new ParcelAlreadyPickedUpException(trackingCode, "A1", LocalDateTime.now()));

        assertThrows(ParcelAlreadyPickedUpException.class,
            () -> dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser));

        verify(parcelService).pickupParcel(storeId, trackingCode);
        verifyNoInteractions(dhlTrackingClient);
    }

    // ════════════════════════════════════════════════════════════════════
    // Fehlende Berechtigung / fehlende Authentifizierung / leerer Code:
    // parcelService/DhlTrackingClient duerfen erst gar nicht aufgerufen werden
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_NoAccess_DeniesWithoutCallingService() {
        Long storeId = 1L;
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(false);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest("JVGL0605379700518040"), mockUser);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
        verifyNoInteractions(dhlTrackingClient);
    }

    @Test
    void testPickupParcel_NotAuthenticated_Denies() {
        Long storeId = 1L;

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest("JVGL0605379700518040"), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
        verifyNoInteractions(dhlTrackingClient);
    }

    @Test
    void testPickupParcel_BlankTrackingCode_ReturnsBadRequestWithoutCallingService() {
        Long storeId = 1L;
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest("  "), mockUser);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
        verifyNoInteractions(dhlTrackingClient);
    }
}
