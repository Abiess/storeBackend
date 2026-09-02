package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Controller - Store Parcel Endpoint Security Tests
 *
 * Sicherheits-Fix: POST /api/stores/{storeId}/dhl/parcels/store darf ein DHL-Paket
 * NUR speichern, wenn die (erneute, backend-seitige) DHL-Tracking-Validierung
 * status == VALID zurückliefert. Fail closed bei NOT_FOUND und technischen Fehlern.
 */
@ExtendWith(MockitoExtension.class)
class DhlControllerStoreParcelTest {

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

    private Map<String, Object> autoRequest(String trackingCode) {
        Map<String, Object> request = new HashMap<>();
        request.put("trackingCode", trackingCode);
        request.put("mode", "auto");
        return request;
    }

    private Store storeWithId(Long storeId) {
        Store store = new Store();
        store.setId(storeId);
        return store;
    }

    // ════════════════════════════════════════════════════════════════════
    // 1 & 2: Frei erfundene Codes → DHL NOT_FOUND → KEINE Einlagerung
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_FabricatedCode_VDBDBJDJDUD_NotFound_DeniesStorage() {
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

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("DHL_TRACKING_NOT_FOUND", body.get("code"));

        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
        verify(parcelService, never()).storeParcel(anyLong(), anyString(), any(), any(), any(), any(), any());
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }

    @Test
    void testStoreParcel_FabricatedCode_hdhsj27373_NotFound_DeniesStorage() {
        Long storeId = 1L;
        String trackingCode = "hdhsj27373";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult notFound = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.NOT_FOUND)
            .trackingCode(trackingCode)
            .dhlResponseCode("100")
            .dhlErrorMessage("Tracking code not found in DHL system")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenReturn(notFound);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("DHL_TRACKING_NOT_FOUND", body.get("code"));

        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
        verify(parcelService, never()).storeParcel(anyLong(), anyString(), any(), any(), any(), any(), any());
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }

    // ════════════════════════════════════════════════════════════════════
    // 3: Echter/Mock VALID Code → Paket wird gespeichert
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_ValidCode_StoresParcel() {
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

        DhlParcel savedParcel = new DhlParcel();
        savedParcel.setId(1L);
        savedParcel.setStore(storeWithId(storeId));
        savedParcel.setTrackingCode(trackingCode);
        savedParcel.setShelfLocation("A1");
        savedParcel.setStatus(DhlParcelStatus.STORED);
        when(parcelService.storeParcel(eq(storeId), eq(trackingCode), eq("auto"), isNull(), isNull(), any(), any()))
            .thenReturn(savedParcel);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
        verify(parcelService).storeParcel(eq(storeId), eq(trackingCode), eq("auto"), isNull(), isNull(), any(), any());
        verify(activityLogService).logStored(eq(storeId), eq(mockUser), eq(trackingCode), eq(1L), eq("A1"), anyLong());
    }

    // ════════════════════════════════════════════════════════════════════
    // 4: VALID mit canonical pieceCode → canonical pieceCode wird gespeichert
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_ValidCode_UsesCanonicalPieceCode() {
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

        DhlParcel savedParcel = new DhlParcel();
        savedParcel.setId(2L);
        savedParcel.setStore(storeWithId(storeId));
        savedParcel.setTrackingCode(canonicalPieceCode);
        savedParcel.setShelfLocation("A2");
        savedParcel.setStatus(DhlParcelStatus.STORED);
        when(parcelService.storeParcel(eq(storeId), eq(canonicalPieceCode), eq("auto"), isNull(), isNull(), any(), any()))
            .thenReturn(savedParcel);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(rawTrackingCode), mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Der Client-Wert (rawTrackingCode) darf NICHT gespeichert werden, sondern der von DHL
        // bestätigte canonical pieceCode.
        ArgumentCaptor<String> trackingCodeCaptor = ArgumentCaptor.forClass(String.class);
        verify(parcelService).storeParcel(eq(storeId), trackingCodeCaptor.capture(), eq("auto"), isNull(), isNull(), any(), any());
        assertEquals(canonicalPieceCode, trackingCodeCaptor.getValue());
        verify(parcelService, never()).storeParcel(eq(storeId), eq(rawTrackingCode), any(), any(), any(), any(), any());
    }

    // ════════════════════════════════════════════════════════════════════
    // 4b: VALID mit DHL-Metadaten → authoritatives ValidationResult wird als
    // 7. Parameter (dhlMetadata) an den Service durchgereicht (Teil A)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_ValidCode_PassesDhlMetadataToService() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult valid = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.VALID)
            .trackingCode(trackingCode)
            .pieceCode(trackingCode)
            .pieceIdentifier("340434664988418341")
            .shipmentStatus("Vsl. am nächsten Werktag in Filiale abholbereit")
            .standardEventCode("ZF")
            .productName("DHL PAKET, Filial-Routing, GoGreen Plus")
            .weightKg(new java.math.BigDecimal("1.76"))
            .dhlResponseCode("0")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenReturn(valid);

        DhlParcel savedParcel = new DhlParcel();
        savedParcel.setId(3L);
        savedParcel.setStore(storeWithId(storeId));
        savedParcel.setTrackingCode(trackingCode);
        savedParcel.setShelfLocation("A3");
        savedParcel.setStatus(DhlParcelStatus.STORED);
        when(parcelService.storeParcel(eq(storeId), eq(trackingCode), eq("auto"), isNull(), isNull(), any(), any()))
            .thenReturn(savedParcel);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<DhlTrackingValidationResult> metadataCaptor =
            ArgumentCaptor.forClass(DhlTrackingValidationResult.class);
        verify(parcelService).storeParcel(eq(storeId), eq(trackingCode), eq("auto"), isNull(), isNull(), any(),
            metadataCaptor.capture());
        assertSame(valid, metadataCaptor.getValue());
        assertEquals("340434664988418341", metadataCaptor.getValue().getPieceIdentifier());
        assertEquals(new java.math.BigDecimal("1.76"), metadataCaptor.getValue().getWeightKg());
    }

    // ════════════════════════════════════════════════════════════════════
    // 5, 6, 7: DHL technische Fehler → KEINE Einlagerung (fail closed)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_DhlAuthenticationError_DeniesStorage() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingException authError = new DhlTrackingException(
            DhlTrackingErrorCode.AUTHENTICATION_ERROR,
            "DHL GKP credentials invalid",
            "dhl.tracking.gkpAuthFailed",
            "5"
        );
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenThrow(authError);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("DHL_AUTHENTICATION_ERROR", body.get("code"));

        verify(parcelService, never()).storeParcel(anyLong(), anyString(), any(), any(), any(), any(), any());
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }

    @Test
    void testStoreParcel_DhlConnectivityError_DeniesStorage() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingException connectivityError = new DhlTrackingException(
            DhlTrackingErrorCode.CONNECTIVITY_ERROR,
            "DHL Tracking API not reachable",
            "dhl.tracking.connectivityError"
        );
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenThrow(connectivityError);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("DHL_CONNECTIVITY_ERROR", body.get("code"));

        verify(parcelService, never()).storeParcel(anyLong(), anyString(), any(), any(), any(), any(), any());
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }

    @Test
    void testStoreParcel_DhlTechnicalError_DeniesStorage() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingException techError = new DhlTrackingException(
            DhlTrackingErrorCode.DHL_TECHNICAL_ERROR,
            "DHL Tracking API technical error",
            "dhl.tracking.technicalError",
            "-1000"
        );
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenThrow(techError);

        ResponseEntity<?> response = dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("DHL_DHL_TECHNICAL_ERROR", body.get("code"));

        verify(parcelService, never()).storeParcel(anyLong(), anyString(), any(), any(), any(), any(), any());
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }

    // ════════════════════════════════════════════════════════════════════
    // 8: Keine Aktivität "Eingelagert" bei fehlgeschlagener DHL-Validierung
    // (bereits durch never()-Verifikationen oben abgedeckt, hier explizit
    // zusätzlich für den NOT_FOUND-Fall inkl. Slot-Zuweisung im MANUAL-Modus)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_ManualMode_NotFound_NeverReservesSlotOrLogsStored() {
        Long storeId = 1L;
        String trackingCode = "VDBDBJDJDUD";
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);

        DhlTrackingValidationResult notFound = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.NOT_FOUND)
            .trackingCode(trackingCode)
            .dhlResponseCode("100")
            .build();
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode)).thenReturn(notFound);

        Map<String, Object> request = new HashMap<>();
        request.put("trackingCode", trackingCode);
        request.put("mode", "manual");
        request.put("slotCode", "A7");

        ResponseEntity<?> response = dhlController.storeParcel(storeId, request, mockUser);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        verify(parcelService, never()).storeParcel(anyLong(), anyString(), any(), any(), any(), any(), any());
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }

    // ════════════════════════════════════════════════════════════════════
    // 9: Bestehende Duplicate-/Slot-Fehler bleiben nach erfolgreicher
    // DHL-Validierung unverändert erreichbar (Regressionsschutz)
    // ════════════════════════════════════════════════════════════════════

    @Test
    void testStoreParcel_ValidCode_DuplicateParcelException_StillPropagates() {
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

        storebackend.exception.ParcelAlreadyStoredException duplicateEx =
            new storebackend.exception.ParcelAlreadyStoredException(trackingCode, "A1", java.time.LocalDateTime.now());
        when(parcelService.storeParcel(eq(storeId), eq(trackingCode), eq("auto"), isNull(), isNull(), any(), any()))
            .thenThrow(duplicateEx);

        assertThrows(storebackend.exception.ParcelAlreadyStoredException.class,
            () -> dhlController.storeParcel(storeId, autoRequest(trackingCode), mockUser));

        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
        verify(activityLogService, never()).logStored(anyLong(), any(), anyString(), anyLong(), anyString(), anyLong());
    }
}
