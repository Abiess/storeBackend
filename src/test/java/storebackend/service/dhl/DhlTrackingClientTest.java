package storebackend.service.dhl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlTrackingValidationResult;
import storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus;
import storebackend.exception.DhlTrackingException;
import storebackend.exception.DhlTrackingException.DhlTrackingErrorCode;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Tracking Client Test
 * 
 * Test-Cases mit REALISTISCHEN XML-Strukturen (echte DHL API Response-Formate)
 */
@ExtendWith(MockitoExtension.class)
class DhlTrackingClientTest {
    
    @Mock
    private DhlProperties dhlProperties;
    
    @Mock
    private DhlSettingsResolver dhlSettingsResolver;
    
    @Mock
    private RestTemplate restTemplate;
    
    @InjectMocks
    private DhlTrackingClient dhlTrackingClient;
    
    private DhlSettingsResolver.ResolvedDhlConfig mockConfig;
    
    @BeforeEach
    void setUp() throws Exception {
        // Mock Config
        mockConfig = new DhlSettingsResolver.ResolvedDhlConfig();
        mockConfig.setEnvironment("SANDBOX");
        mockConfig.setClientId("test-client-id");
        mockConfig.setClientSecret("test-client-secret");
        mockConfig.setUsername("test-username");
        mockConfig.setPassword("test-password");
        mockConfig.setCredentialsSource("STORE");
        
        when(dhlSettingsResolver.resolve(anyLong())).thenReturn(mockConfig);
        when(dhlProperties.getTrackingSandboxBaseUrl())
            .thenReturn("https://api-sandbox.dhl.com/parcel/de/tracking/v0");
        
        // RestTemplate als echtes Objekt einsetzen (für XML-Parsing)
        java.lang.reflect.Field restTemplateField = DhlTrackingClient.class.getDeclaredField("restTemplate");
        restTemplateField.setAccessible(true);
        restTemplateField.set(dhlTrackingClient, restTemplate);
    }
    
    /**
     * Test A: code=0 → VALID
     * Realistische XML-Struktur mit verschachtelten <data> Elementen
     */
    @Test
    void testValidateTrackingCode_Valid_Code0() {
        // Given
        String trackingCode = "00340434664988418341";
        String responseXml = 
            "<data request-id=\"abc-123-def\">" +
            "  <data name=\"piece-status-public-list\" code=\"0\">" +
            "    <data name=\"piece-status-public\" " +
            "          searched-piece-code=\"00340434664988418341\" " +
            "          piece-code=\"00340434664988418341\" " +
            "          piece-identifier=\"340434664988418341\" " +
            "          status=\"Vsl. am nächsten Werktag in Filiale abholbereit\" " +
            "          product-name=\"DHL PAKET, Filial-Routing, GoGreen Plus\" " +
            "          standard-event-code=\"ZF\" " +
            "          shipment-weight=\"2.5\" />" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When
        DhlTrackingValidationResult result = dhlTrackingClient.validateTrackingCode(1L, trackingCode);
        
        // Then
        assertNotNull(result);
        assertEquals(DhlTrackingValidationStatus.VALID, result.getStatus());
        assertTrue(result.isValid());
        assertEquals("00340434664988418341", result.getTrackingCode());
        assertEquals("00340434664988418341", result.getPieceCode());
        assertEquals("340434664988418341", result.getPieceIdentifier());
        assertEquals("Vsl. am nächsten Werktag in Filiale abholbereit", result.getShipmentStatus());
        assertEquals("DHL PAKET, Filial-Routing, GoGreen Plus", result.getProductName());
        assertEquals("ZF", result.getStandardEventCode());
        assertEquals(new BigDecimal("2.5"), result.getWeightKg());
        assertEquals("0", result.getDhlResponseCode());
    }
    
    /**
     * Test B: code=100 → NOT_FOUND (kein Fehler!)
     */
    @Test
    void testValidateTrackingCode_NotFound_Code100() {
        // Given
        String trackingCode = "99999999999999999999";
        String responseXml = 
            "<data request-id=\"xyz-789\">" +
            "  <data name=\"piece-status-public-list\" code=\"100\">" +
            "    <!-- Kein piece-status-public Element bei NOT_FOUND -->" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When
        DhlTrackingValidationResult result = dhlTrackingClient.validateTrackingCode(1L, trackingCode);
        
        // Then
        assertNotNull(result);
        assertEquals(DhlTrackingValidationStatus.NOT_FOUND, result.getStatus());
        assertFalse(result.isValid());
        assertEquals("99999999999999999999", result.getTrackingCode());
        assertEquals("100", result.getDhlResponseCode());
        assertEquals("Tracking code not found in DHL system", result.getDhlErrorMessage());
        assertNull(result.getPieceCode());
    }
    
    /**
     * Test C: code=5 → AUTHENTICATION_ERROR
     */
    @Test
    void testValidateTrackingCode_AuthenticationError_Code5() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = 
            "<data request-id=\"err-auth\">" +
            "  <data name=\"piece-status-public-list\" code=\"5\">" +
            "    <!-- Auth Error -->" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.AUTHENTICATION_ERROR, exception.getErrorCode());
        assertEquals("5", exception.getDhlResponseCode());
        assertEquals("dhl.tracking.gkpAuthFailed", exception.getMessageKey());
        assertTrue(exception.getMessage().contains("GKP credentials invalid"));
    }
    
    /**
     * Test D: code=-1000 → DHL_TECHNICAL_ERROR
     */
    @Test
    void testValidateTrackingCode_TechnicalError_CodeMinus1000() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = 
            "<data request-id=\"err-tech\">" +
            "  <data name=\"piece-status-public-list\" code=\"-1000\">" +
            "    <!-- Technical Error -->" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.DHL_TECHNICAL_ERROR, exception.getErrorCode());
        assertEquals("-1000", exception.getDhlResponseCode());
        assertEquals("dhl.tracking.technicalError", exception.getMessageKey());
    }
    
    /**
     * Test E: Ungültiges XML → XML_PARSING_ERROR
     */
    @Test
    void testValidateTrackingCode_InvalidXml_ParsingError() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = "<invalid-xml-not-closed>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.XML_PARSING_ERROR, exception.getErrorCode());
        assertEquals("dhl.tracking.xmlParsingError", exception.getMessageKey());
        assertTrue(exception.getMessage().contains("Failed to parse"));
    }
    
    /**
     * Test F: HTTP Timeout → CONNECTIVITY_ERROR
     */
    @Test
    void testValidateTrackingCode_Timeout_ConnectivityError() {
        // Given
        String trackingCode = "12345678901234567890";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenThrow(new ResourceAccessException("Connection timeout"));
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.CONNECTIVITY_ERROR, exception.getErrorCode());
        assertEquals("dhl.tracking.connectivityError", exception.getMessageKey());
        assertTrue(exception.getMessage().contains("not reachable"));
    }
    
    /**
     * Test G: HTTP 401 Unauthorized → AUTHENTICATION_ERROR
     */
    @Test
    void testValidateTrackingCode_Http401_AuthenticationError() {
        // Given
        String trackingCode = "12345678901234567890";
        // Wichtig: Unterklasse HttpClientErrorException.Unauthorized verwenden!
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenThrow(HttpClientErrorException.Unauthorized.create(
                HttpStatus.UNAUTHORIZED, 
                "Unauthorized", 
                HttpHeaders.EMPTY, 
                new byte[0], 
                null
            ));
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.AUTHENTICATION_ERROR, exception.getErrorCode());
        assertEquals("dhl.tracking.authFailed", exception.getMessageKey());
        assertTrue(exception.getMessage().contains("authentication failed"));
    }
    
    /**
     * Test H: HTTP 5xx Server Error → DHL_TECHNICAL_ERROR
     */
    @Test
    void testValidateTrackingCode_Http500_TechnicalError() {
        // Given
        String trackingCode = "12345678901234567890";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR, "Server Error"));
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.DHL_TECHNICAL_ERROR, exception.getErrorCode());
        assertEquals("dhl.tracking.serverError", exception.getMessageKey());
    }
    
    /**
     * Test I: Fehlende piece-status-public-list → XML_PARSING_ERROR
     */
    @Test
    void testValidateTrackingCode_MissingStatusList_ParsingError() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = 
            "<data request-id=\"err-missing\">" +
            "  <!-- Kein piece-status-public-list Element -->" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.XML_PARSING_ERROR, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("missing expected"));
    }
    
    /**
     * Test J: code=0 aber fehlendes piece-status-public → XML_PARSING_ERROR
     */
    @Test
    void testValidateTrackingCode_Code0ButMissingDetails_ParsingError() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = 
            "<data request-id=\"err-incomplete\">" +
            "  <data name=\"piece-status-public-list\" code=\"0\">" +
            "    <!-- code=0 aber KEIN piece-status-public Element -->" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.XML_PARSING_ERROR, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("missing shipment details"));
    }
    
    /**
     * Test K: Unbekannter DHL Error Code → UNKNOWN_DHL_ERROR
     */
    @Test
    void testValidateTrackingCode_UnknownErrorCode_UnknownDhlError() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = 
            "<data request-id=\"err-unknown\">" +
            "  <data name=\"piece-status-public-list\" code=\"999\">" +
            "    <!-- Unbekannter Error Code -->" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When & Then
        DhlTrackingException exception = assertThrows(
            DhlTrackingException.class,
            () -> dhlTrackingClient.validateTrackingCode(1L, trackingCode)
        );
        
        assertEquals(DhlTrackingErrorCode.UNKNOWN_DHL_ERROR, exception.getErrorCode());
        assertEquals("999", exception.getDhlResponseCode());
        assertEquals("dhl.tracking.unknownError", exception.getMessageKey());
        assertTrue(exception.getMessage().contains("unknown error code"));
    }
    
    /**
     * Test L: Tracking-Code mit Spaces/Lowercase → Normalisierung
     */
    @Test
    void testValidateTrackingCode_WithSpacesAndLowercase_Normalized() {
        // Given
        String trackingCode = "  jvgl 0605 3797 0051 8040  ";
        String responseXml = 
            "<data request-id=\"norm-test\">" +
            "  <data name=\"piece-status-public-list\" code=\"0\">" +
            "    <data name=\"piece-status-public\" " +
            "          searched-piece-code=\"JVGL0605379700518040\" " +
            "          piece-code=\"JVGL0605379700518040\" " +
            "          piece-identifier=\"0605379700518040\" " +
            "          status=\"Delivered\" " +
            "          product-name=\"DHL PAKET\" " +
            "          standard-event-code=\"ZU\" " +
            "          shipment-weight=\"1.2\" />" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When
        DhlTrackingValidationResult result = dhlTrackingClient.validateTrackingCode(1L, trackingCode);
        
        // Then
        assertNotNull(result);
        assertEquals(DhlTrackingValidationStatus.VALID, result.getStatus());
        assertEquals("JVGL0605379700518040", result.getTrackingCode());
        assertEquals("JVGL0605379700518040", result.getPieceCode());
    }
    
    /**
     * Test M: Leere Eingabe → IllegalArgumentException
     * Input-Validation findet VOR Config-Resolving statt
     */
    @Test
    void testValidateTrackingCode_EmptyInput_IllegalArgument() {
        // Given - reset Mocks um UnnecessaryStubbing zu vermeiden
        reset(dhlSettingsResolver, dhlProperties, restTemplate);
        
        // When & Then - direkt ohne Config/RestTemplate Calls
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, 
            () -> dhlTrackingClient.validateTrackingCode(1L, ""));
        assertTrue(ex1.getMessage().contains("cannot be empty"));
        
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, 
            () -> dhlTrackingClient.validateTrackingCode(1L, "   "));
        assertTrue(ex2.getMessage().contains("cannot be empty"));
        
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class, 
            () -> dhlTrackingClient.validateTrackingCode(1L, null));
        assertTrue(ex3.getMessage().contains("cannot be empty"));
        
        // Verify: Config/RestTemplate wurde NICHT aufgerufen
        verify(dhlSettingsResolver, never()).resolve(anyLong());
        verify(restTemplate, never()).exchange(anyString(), any(), any(), any(Class.class));
    }
    
    /**
     * Test N: Gewicht fehlt → null (kein Fehler)
     */
    @Test
    void testValidateTrackingCode_MissingWeight_NullWeight() {
        // Given
        String trackingCode = "12345678901234567890";
        String responseXml = 
            "<data request-id=\"no-weight\">" +
            "  <data name=\"piece-status-public-list\" code=\"0\">" +
            "    <data name=\"piece-status-public\" " +
            "          searched-piece-code=\"12345678901234567890\" " +
            "          piece-code=\"12345678901234567890\" " +
            "          piece-identifier=\"1234567890\" " +
            "          status=\"In Transit\" " +
            "          product-name=\"DHL PAKET\" " +
            "          standard-event-code=\"AA\" />" +
            "    <!-- shipment-weight fehlt -->" +
            "  </data>" +
            "</data>";
        
        ResponseEntity<String> mockResponse = new ResponseEntity<>(responseXml, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(mockResponse);
        
        // When
        DhlTrackingValidationResult result = dhlTrackingClient.validateTrackingCode(1L, trackingCode);
        
        // Then
        assertNotNull(result);
        assertEquals(DhlTrackingValidationStatus.VALID, result.getStatus());
        assertNull(result.getWeightKg());
    }
}
