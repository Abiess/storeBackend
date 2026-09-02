package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import storebackend.dto.DhlPickupParcelRequest;
import storebackend.dto.dhl.DhlTrackingValidationResult;
import storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.DhlTrackingException;
import storebackend.exception.DhlTrackingException.DhlTrackingErrorCode;
import storebackend.service.DhlActivityLogService;
import storebackend.service.DhlParcelService;
import storebackend.service.dhl.DhlTrackingClient;
import storebackend.util.StoreAccessChecker;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Controller - Pickup Parcel Endpoint Security Tests (Teil C)
 *
 * Sicherheits-Fix: POST /api/stores/{storeId}/dhl/parcels/pickup darf ein Paket
 * NUR als PICKED_UP markieren, wenn die (backend-seitige) DHL-Tracking-Validierung
 * status == VALID zurückliefert. Fail closed bei NOT_FOUND und technischen Fehlern.
 * Ein direkter curl/Postman-Aufruf ohne DHL-Bestätigung darf NICHT zur Abholung führen.
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
    // Fantasiecode → DHL NOT_FOUND → KEINE Abholung
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_FabricatedCode_NotFound_DeniesPickup() {
        Long storeId = 1L;
        String trackingCode = "VDBDBJDJDUD";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult notFound = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.NOT_FOUND)
            .trackingCode(trackingCode)
            .dhlResponseCode("100")
            .dhlErrorMessage("Tracking code not found in DHL system")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenReturn(notFound);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }

    // ════════════════════════════════════════════════════════════════════
    // Technischer DHL Fehler → KEINE Abholung (fail closed)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_DhlTechnicalError_DeniesPickup() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(new DhlTrackingException(DhlTrackingErrorCode.DHL_TECHNICAL_ERROR,
                "DHL Tracking API technical error", "dhl.tracking.technicalError"));

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }

    @Test
    void testPickupParcel_DhlConnectivityError_DeniesPickup() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(new DhlTrackingException(DhlTrackingErrorCode.CONNECTIVITY_ERROR,
                "DHL Tracking API not reachable", "dhl.tracking.connectivityError"));

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }

    @Test
    void testPickupParcel_DhlValidationError_DeniesPickupWith422() {
        Long storeId = 1L;
        String trackingCode = "14411111114";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(new DhlTrackingException(DhlTrackingErrorCode.DHL_VALIDATION_ERROR,
                "DHL Tracking API returned an unrecognized response code: 40",
                "dhl.tracking.validationError", "40"));

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        // DHL_VALIDATION_ERROR ist ein fachlicher 4xx-Fehler, KEIN 500 (DHL hat geantwortet)
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }

    // ════════════════════════════════════════════════════════════════════
    // VALID → lokale Suche mit dem vom Service zurückgegebenen Ergebnis
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_ValidCode_ProceedsToLocalLookup() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult valid = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.VALID)
            .trackingCode(trackingCode)
            .pieceCode(trackingCode)
            .dhlResponseCode("0")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenReturn(valid);

        DhlParcel pickedUp = new DhlParcel();
        pickedUp.setId(1L);
        pickedUp.setStore(storeWithId(storeId));
        pickedUp.setTrackingCode(trackingCode);
        pickedUp.setShelfLocation("A1");
        pickedUp.setStatus(DhlParcelStatus.PICKED_UP);
        when(parcelService.pickupParcel(storeId, trackingCode)).thenReturn(pickedUp);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
        verify(parcelService).pickupParcel(storeId, trackingCode);
    }

    // ════════════════════════════════════════════════════════════════════
    // VALID mit canonical pieceCode → lokale Suche verwendet den kanonischen Code,
    // NICHT den rohen Client-Input
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_ValidCode_UsesCanonicalPieceCodeForLookup() {
        Long storeId = 1L;
        String rawTrackingCode = "(00)340434664988418341";
        String canonicalPieceCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult valid = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.VALID)
            .trackingCode(rawTrackingCode)
            .pieceCode(canonicalPieceCode)
            .dhlResponseCode("0")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, rawTrackingCode)).thenReturn(valid);

        DhlParcel pickedUp = new DhlParcel();
        pickedUp.setId(2L);
        pickedUp.setStore(storeWithId(storeId));
        pickedUp.setTrackingCode(canonicalPieceCode);
        pickedUp.setShelfLocation("A2");
        pickedUp.setStatus(DhlParcelStatus.PICKED_UP);
        when(parcelService.pickupParcel(storeId, canonicalPieceCode)).thenReturn(pickedUp);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(rawTrackingCode), mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(parcelService).pickupParcel(storeId, canonicalPieceCode);
        verify(parcelService, never()).pickupParcel(storeId, rawTrackingCode);
    }

    // ════════════════════════════════════════════════════════════════════
    // Direkter curl/Postman-Aufruf ohne vorherige Frontend-Validierung darf die
    // DHL-Prüfung nicht umgehen: der Controller validiert IMMER selbst.
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_DirectApiCall_CannotBypassDhlValidation() {
        Long storeId = 1L;
        String trackingCode = "hdhsj27373";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult notFound = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.NOT_FOUND)
            .trackingCode(trackingCode)
            .dhlResponseCode("100")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenReturn(notFound);

        // Direkter Aufruf des Controllers ohne vorherige /tracking/validate Anfrage -
        // der Controller MUSS trotzdem selbst gegen DHL validieren.
        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }

    // ════════════════════════════════════════════════════════════════════
    // Fehlende Berechtigung / fehlende Authentifizierung
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testPickupParcel_NoAccess_DeniesWithoutCallingDhl() {
        Long storeId = 1L;
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(false);

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest("JVGL0605379700518040"), mockUser);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(dhlTrackingClient, never()).validateTrackingCode(anyLong(), anyString());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }

    @Test
    void testPickupParcel_NotAuthenticated_Denies() {
        Long storeId = 1L;

        ResponseEntity<?> response = dhlController.pickupParcel(storeId, pickupRequest("JVGL0605379700518040"), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(dhlTrackingClient, never()).validateTrackingCode(anyLong(), anyString());
        verify(parcelService, never()).pickupParcel(anyLong(), anyString());
    }
}
