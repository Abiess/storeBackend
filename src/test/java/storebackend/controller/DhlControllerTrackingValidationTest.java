package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import storebackend.dto.dhl.DhlTrackingValidationResult;
import storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus;
import storebackend.entity.User;
import storebackend.exception.DhlConfigurationException;
import storebackend.exception.DhlTrackingException;
import storebackend.exception.DhlTrackingException.DhlTrackingErrorCode;
import storebackend.service.DhlActivityLogService;
import storebackend.service.DhlParcelService;
import storebackend.service.dhl.DhlTrackingClient;
import storebackend.util.StoreAccessChecker;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Controller - Tracking Validation Endpoint Tests
 * 
 * Testet POST /api/stores/{storeId}/dhl/tracking/validate
 */
@ExtendWith(MockitoExtension.class)
class DhlControllerTrackingValidationTest {
    
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
    
    /**
     * Test 1: Valid tracking code → HTTP 200 + valid=true
     */
    @Test
    void testValidateTrackingCode_ValidCode_ReturnsSuccess() {
        // Given
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        DhlTrackingValidationResult mockResult = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.VALID)
            .trackingCode(trackingCode)
            .pieceCode(trackingCode)
            .pieceIdentifier("340434664988418341")
            .shipmentStatus("Vsl. am nächsten Werktag in Filiale abholbereit")
            .standardEventCode("ZF")
            .productName("DHL PAKET, Filial-Routing, GoGreen Plus")
            .weightKg(new BigDecimal("2.5"))
            .dhlResponseCode("0")
            .build();
        
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenReturn(mockResult);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        DhlTrackingValidationResult result = (DhlTrackingValidationResult) response.getBody();
        assertEquals(DhlTrackingValidationStatus.VALID, result.getStatus());
        assertTrue(result.isValid());
        assertEquals(trackingCode, result.getTrackingCode());
        assertEquals("ZF", result.getStandardEventCode());
        
        verify(storeAccessChecker).hasStoreAccess(storeId);
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
    }
    
    /**
     * Test 2: Code 100 (NOT_FOUND) → HTTP 200 + valid=false
     */
    @Test
    void testValidateTrackingCode_NotFound_ReturnsSuccess() {
        // Given
        Long storeId = 1L;
        String trackingCode = "99999999999999999999";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        DhlTrackingValidationResult mockResult = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.NOT_FOUND)
            .trackingCode(trackingCode)
            .dhlResponseCode("100")
            .dhlErrorMessage("Tracking code not found in DHL system")
            .build();
        
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenReturn(mockResult);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        DhlTrackingValidationResult result = (DhlTrackingValidationResult) response.getBody();
        assertEquals(DhlTrackingValidationStatus.NOT_FOUND, result.getStatus());
        assertFalse(result.isValid());
        assertEquals("100", result.getDhlResponseCode());
        
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
    }
    
    /**
     * Test 3: DHL Auth Error → HTTP 503
     */
    @Test
    void testValidateTrackingCode_AuthError_ReturnsServiceUnavailable() {
        // Given
        Long storeId = 1L;
        String trackingCode = "12345678901234567890";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        DhlTrackingException authException = new DhlTrackingException(
            DhlTrackingErrorCode.AUTHENTICATION_ERROR,
            "DHL GKP credentials invalid",
            "dhl.tracking.gkpAuthFailed",
            "5"
        );
        
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(authException);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("DHL tracking validation failed", errorBody.get("error"));
        assertEquals("AUTHENTICATION_ERROR", errorBody.get("errorCode"));
        assertEquals("dhl.tracking.gkpAuthFailed", errorBody.get("messageKey"));
        
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
    }
    
    /**
     * Test 4: DHL Timeout → HTTP 504
     */
    @Test
    void testValidateTrackingCode_Timeout_ReturnsGatewayTimeout() {
        // Given
        Long storeId = 1L;
        String trackingCode = "12345678901234567890";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        DhlTrackingException timeoutException = new DhlTrackingException(
            DhlTrackingErrorCode.CONNECTIVITY_ERROR,
            "DHL Tracking API not reachable",
            "dhl.tracking.connectivityError"
        );
        
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(timeoutException);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("DHL tracking validation failed", errorBody.get("error"));
        assertEquals("CONNECTIVITY_ERROR", errorBody.get("errorCode"));
        
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
    }
    
    /**
     * Test 5: Missing tracking code → HTTP 400
     */
    @Test
    void testValidateTrackingCode_MissingCode_ReturnsBadRequest() {
        // Given
        Long storeId = 1L;
        Map<String, String> request = Map.of(); // Empty request
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("Tracking code is required", errorBody.get("error"));
        
        verify(storeAccessChecker).hasStoreAccess(storeId);
        verify(dhlTrackingClient, never()).validateTrackingCode(anyLong(), anyString());
    }
    
    /**
     * Test 6: No store access → HTTP 403
     */
    @Test
    void testValidateTrackingCode_NoStoreAccess_ReturnsForbidden() {
        // Given
        Long storeId = 999L; // Fremder Store
        String trackingCode = "12345678901234567890";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(false);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("Access denied to store", errorBody.get("error"));
        
        verify(storeAccessChecker).hasStoreAccess(storeId);
        verify(dhlTrackingClient, never()).validateTrackingCode(anyLong(), anyString());
    }
    
    /**
     * Test 7: Not authenticated → HTTP 401
     */
    @Test
    void testValidateTrackingCode_NotAuthenticated_ReturnsUnauthorized() {
        // Given
        Long storeId = 1L;
        String trackingCode = "12345678901234567890";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        User nullUser = null;
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, nullUser);
        
        // Then
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("Authentication required", errorBody.get("error"));
        
        verify(storeAccessChecker, never()).hasStoreAccess(anyLong());
        verify(dhlTrackingClient, never()).validateTrackingCode(anyLong(), anyString());
    }
    
    /**
     * Test 8: DHL not configured → HTTP 503
     */
    @Test
    void testValidateTrackingCode_DhlNotConfigured_ReturnsServiceUnavailable() {
        // Given
        Long storeId = 1L;
        String trackingCode = "12345678901234567890";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        DhlConfigurationException configException = new DhlConfigurationException(
            "DHL integration is not enabled for this store",
            "dhl.tracking.notEnabled"
        );
        
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(configException);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("DHL integration not configured", errorBody.get("error"));
        assertEquals("dhl.tracking.notEnabled", errorBody.get("messageKey"));
        
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
    }
    
    /**
     * Test 9: Empty/blank tracking code → HTTP 400
     */
    @Test
    void testValidateTrackingCode_BlankCode_ReturnsBadRequest() {
        // Given
        Long storeId = 1L;
        Map<String, String> request = Map.of("trackingCode", "   "); // Blank
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("Tracking code is required", errorBody.get("error"));
        
        verify(dhlTrackingClient, never()).validateTrackingCode(anyLong(), anyString());
    }
    
    /**
     * Test 10: DHL Technical Error → HTTP 500
     */
    @Test
    void testValidateTrackingCode_TechnicalError_ReturnsInternalServerError() {
        // Given
        Long storeId = 1L;
        String trackingCode = "12345678901234567890";
        Map<String, String> request = Map.of("trackingCode", trackingCode);
        
        when(storeAccessChecker.hasStoreAccess(storeId)).thenReturn(true);
        
        DhlTrackingException techException = new DhlTrackingException(
            DhlTrackingErrorCode.DHL_TECHNICAL_ERROR,
            "DHL Tracking API technical error",
            "dhl.tracking.technicalError",
            "-1000"
        );
        
        when(dhlTrackingClient.validateTrackingCode(storeId, trackingCode))
            .thenThrow(techException);
        
        // When
        ResponseEntity<?> response = dhlController.validateTrackingCode(storeId, request, mockUser);
        
        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> errorBody = (Map<String, Object>) response.getBody();
        assertEquals("DHL tracking validation failed", errorBody.get("error"));
        assertEquals("DHL_TECHNICAL_ERROR", errorBody.get("errorCode"));
        
        verify(dhlTrackingClient).validateTrackingCode(storeId, trackingCode);
    }
}
