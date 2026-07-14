package storebackend.service.dhl;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlShipmentRequest;
import storebackend.dto.dhl.DhlShipmentResponse;

/**
 * DHL Shipping Client - Label Creation & Validation
 * API: /parcel/de/shipping/v2
 * 
 * Multi-Store Support:
 * - Nutzt ResolvedDhlConfig für store-aware API Calls
 * - Unterstützt SANDBOX | STORE | PLATFORM Credentials
 * - Token Management via DhlAuthClient
 * 
 * Security:
 * - Kein access_token loggen
 * - Kein clientSecret loggen
 * - Kein label.b64 loggen
 * - Nur config.getLoggingInfo() für Audit
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlShippingClient {
    
    private final DhlProperties dhlProperties;
    private final DhlAuthClient dhlAuthClient;
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Health Check / Version Info
     * GET /
     */
    public JsonNode healthCheck() {
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        try {
            String url = dhlProperties.getShippingBaseUrl() + "/";
            String token = dhlAuthClient.getAccessToken();
            
            HttpHeaders headers = createHeaders(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                JsonNode.class
            );
            
            log.info("✅ DHL Shipping API Health Check successful");
            return response.getBody();
            
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("⚠️ DHL Token expired, retrying with fresh token...");
            dhlAuthClient.invalidateToken();
            return healthCheck(); // Retry mit neuem Token
            
        } catch (RestClientException e) {
            log.error("❌ DHL Health Check failed: {}", e.getMessage());
            throw new RuntimeException("DHL Health Check failed", e);
        }
    }
    
    /**
     * Validate Shipment (ohne Label zu erzeugen)
     * POST /orders?validate=true
     * 
     * EMPFOHLEN: Nutze diese Methode mit config für store-aware validation
     * 
     * @param config Resolved DHL Config
     * @param request DHL Shipment Request
     * @return DHL Validation Response
     */
    public DhlShipmentResponse validateShipment(
        DhlSettingsResolver.ResolvedDhlConfig config,
        DhlShipmentRequest request
    ) {
        try {
            String url = config.getShippingBaseUrl() + "/orders?validate=true";
            String token = dhlAuthClient.getAccessToken(config);
            
            HttpHeaders headers = createHeaders(token);
            HttpEntity<DhlShipmentRequest> httpRequest = new HttpEntity<>(request, headers);
            
            // CRITICAL: Log final URL with validate=true
            log.info("🔍 DHL Validate Request URL: POST {}", 
                url.replace(config.getShippingBaseUrl(), "/shipping/v2"));
            
            log.info("🔍 Validating DHL shipment: refNo={}, credentialsSource={}, {}",
                request.getShipments().get(0).getRefNo(),
                config.getCredentialsSource(),
                config.getLoggingInfo()
            );
            
            ResponseEntity<DhlShipmentResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                httpRequest,
                DhlShipmentResponse.class
            );
            
            DhlShipmentResponse body = response.getBody();
            
            if (response.getStatusCode() == HttpStatus.OK && body != null) {
                log.info("✅ DHL Shipment validation successful for refNo: {}", 
                    request.getShipments().get(0).getRefNo());
                
                // Log validation warnings/errors
                if (body.getValidationMessages() != null && !body.getValidationMessages().isEmpty()) {
                    body.getValidationMessages().forEach(msg -> {
                        if ("Error".equals(msg.getValidationState())) {
                            log.error("❌ DHL Validation Error: {} ({})", 
                                msg.getValidationMessage(), msg.getPropertyPath());
                        } else {
                            log.warn("⚠️ DHL Validation Warning: {} ({})", 
                                msg.getValidationMessage(), msg.getPropertyPath());
                        }
                    });
                }
                
                return body;
            }
            
            throw new RuntimeException("DHL validation failed: " + response.getStatusCode());
            
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("⚠️ DHL Token expired, retrying with fresh token...");
            dhlAuthClient.invalidateToken(config);
            return validateShipment(config, request); // Retry
            
        } catch (HttpClientErrorException.BadRequest e) {
            // 400: DHL Validation Fehler
            String errorBody = e.getResponseBodyAsString();
            log.error("❌ DHL Validation failed (400 Bad Request): {}", errorBody);
            // Re-throw original exception to preserve status and body
            throw e;
            
        } catch (HttpServerErrorException e) {
            // 5xx: DHL Server Error - preserve original exception
            log.error("❌ DHL API Server Error ({}): {}", 
                e.getStatusCode().value(), e.getResponseBodyAsString());
            throw e;
            
        } catch (HttpClientErrorException e) {
            log.error("❌ DHL Validation failed with status {}: {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            // Re-throw to preserve details
            throw e;
            
        } catch (RestClientException e) {
            log.error("❌ DHL Validation API Error: {}", e.getMessage());
            throw new RuntimeException("DHL Validation API Error", e);
        }
    }
    
    /**
     * Validate Shipment (alte Methode - deprecated)
     * POST /orders?validate=true
     * 
     * @deprecated Nutze stattdessen validateShipment(ResolvedDhlConfig config, DhlShipmentRequest request)
     */
    @Deprecated
    public DhlShipmentResponse validateShipment(DhlShipmentRequest request) {
        log.warn("Using deprecated validateShipment() without config parameter. " +
            "This only works for global Sandbox. Use validateShipment(config, request) instead.");
        
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        // Baue minimale Config aus globalen Properties (nur Sandbox!)
        if (!dhlProperties.isSandbox()) {
            throw new UnsupportedOperationException(
                "Production mode requires config parameter. " +
                "Use validateShipment(ResolvedDhlConfig config, DhlShipmentRequest request)."
            );
        }
        
        // Build minimal config for deprecated method
        DhlSettingsResolver.ResolvedDhlConfig globalConfig = new DhlSettingsResolver.ResolvedDhlConfig();
        globalConfig.setCredentialsSource("DEPRECATED");
        globalConfig.setEnvironment(dhlProperties.getEnv());
        globalConfig.setClientId(dhlProperties.getClientId());
        globalConfig.setClientSecret(dhlProperties.getClientSecret());
        globalConfig.setUsername(dhlProperties.getSandboxUsername());
        globalConfig.setPassword(dhlProperties.getSandboxPassword());
        
        return validateShipment(globalConfig, request);
    }
    
    /**
     * Create Shipment Label
     * POST /orders
     * 
     * EMPFOHLEN: Nutze diese Methode mit config für store-aware label creation
     * 
     * @param config Resolved DHL Config
     * @param request DHL Shipment Request
     * @return DHL Label Response mit PDF
     */
    public DhlShipmentResponse createLabel(
        DhlSettingsResolver.ResolvedDhlConfig config,
        DhlShipmentRequest request
    ) {
        try {
            String url = config.getShippingBaseUrl() + "/orders";
            String token = dhlAuthClient.getAccessToken(config);
            
            HttpHeaders headers = createHeaders(token);
            HttpEntity<DhlShipmentRequest> httpRequest = new HttpEntity<>(request, headers);
            
            // Sanitized logging (NO personal data, NO label.b64!)
            DhlShipmentRequest.Shipment shipment = request.getShipments().get(0);
            DhlShipmentRequest.Address shipper = shipment.getShipper();
            DhlShipmentRequest.Address consignee = shipment.getConsignee();
            DhlShipmentRequest.Details details = shipment.getDetails();
            
            log.info("📦 Creating DHL shipment: refNo={}, product={}, billingNumber={}, " +
                    "shipper={}/{}/{}, consignee={}/{}/{}, weight={}{}, dim={}x{}x{}{}, credentialsSource={}, {}",
                shipment.getRefNo(),
                shipment.getProduct(),
                maskBillingNumber(shipment.getBillingNumber()),
                shipper.getPostalCode(),
                shipper.getCity(),
                shipper.getCountry(),
                consignee.getPostalCode(),
                consignee.getCity(),
                consignee.getCountry(),
                details.getWeight().getValue(),
                details.getWeight().getUom(),
                details.getDim().getLength(),
                details.getDim().getWidth(),
                details.getDim().getHeight(),
                details.getDim().getUom(),
                config.getCredentialsSource(),
                config.getLoggingInfo()
            );
            
            ResponseEntity<DhlShipmentResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                httpRequest,
                DhlShipmentResponse.class
            );
            
            DhlShipmentResponse body = response.getBody();
            
            if (response.getStatusCode() == HttpStatus.OK && body != null) {
                log.info("✅ DHL Shipment created successfully!");
                log.info("   ShipmentNo: {}", body.getShipmentNo());
                log.info("   RoutingCode: {}", body.getRoutingCode());
                log.info("   UUID: {}", body.getUuid());
                log.info("   Label Format: {}", 
                    body.getLabel() != null ? body.getLabel().getFileFormat() : "N/A");
                // WICHTIG: label.b64 NICHT loggen!
                
                // Log validation warnings (Errors würden zu Fehler führen)
                if (body.getValidationMessages() != null && !body.getValidationMessages().isEmpty()) {
                    body.getValidationMessages().forEach(msg -> 
                        log.warn("⚠️ DHL Warning: {} ({})", 
                            msg.getValidationMessage(), msg.getPropertyPath())
                    );
                }
                
                return body;
            }
            
            throw new RuntimeException("DHL shipment creation failed: " + response.getStatusCode());
            
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("⚠️ DHL Token expired, retrying with fresh token...");
            dhlAuthClient.invalidateToken(config);
            return createLabel(config, request); // Retry
            
        } catch (HttpClientErrorException.BadRequest e) {
            // 400: DHL Validation Fehler
            String errorBody = e.getResponseBodyAsString();
            log.error("❌ DHL Shipment creation failed (400 Bad Request): {}", errorBody);
            throw new RuntimeException("DHL Shipment creation failed: " + errorBody, e);
            
        } catch (HttpClientErrorException e) {
            log.error("❌ DHL Shipment creation failed with status {}: {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            
            // Parse DHL error response if possible
            String dhlError = "DHL Shipment creation failed";
            String dhlDetail = e.getResponseBodyAsString();
            
            try {
                // DHL errors have format: {"title":"...", "detail":"...", "status":400}
                if (dhlDetail != null && dhlDetail.contains("\"detail\"")) {
                    dhlError = "DHL API validation failed";
                }
            } catch (Exception ignored) {
                // Falls Parsing fehlschlägt, Original-Message verwenden
            }
            
            throw new RuntimeException(dhlError + ": " + e.getStatusCode() + " " + 
                e.getStatusText() + " - " + dhlDetail, e);
            
        } catch (RestClientException e) {
            log.error("❌ DHL Shipping API Error: {}", e.getMessage());
            throw new RuntimeException("DHL Shipping API Error", e);
        }
    }
    
    /**
     * Create Shipment Label (alte Methode - deprecated)
     * POST /orders
     * 
     * @deprecated Nutze stattdessen createLabel(ResolvedDhlConfig config, DhlShipmentRequest request)
     */
    @Deprecated
    public DhlShipmentResponse createLabel(DhlShipmentRequest request) {
        log.warn("Using deprecated createLabel() without config parameter. " +
            "This only works for global Sandbox. Use createLabel(config, request) instead.");
        
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        // Baue minimale Config aus globalen Properties (nur Sandbox!)
        if (!dhlProperties.isSandbox()) {
            throw new UnsupportedOperationException(
                "Production mode requires config parameter. " +
                "Use createLabel(ResolvedDhlConfig config, DhlShipmentRequest request)."
            );
        }
        
        // Build minimal config for deprecated method
        DhlSettingsResolver.ResolvedDhlConfig globalConfig = new DhlSettingsResolver.ResolvedDhlConfig();
        globalConfig.setCredentialsSource("DEPRECATED");
        globalConfig.setEnvironment(dhlProperties.getEnv());
        globalConfig.setClientId(dhlProperties.getClientId());
        globalConfig.setClientSecret(dhlProperties.getClientSecret());
        globalConfig.setUsername(dhlProperties.getSandboxUsername());
        globalConfig.setPassword(dhlProperties.getSandboxPassword());
        
        return createLabel(globalConfig, request);
    }
    
    /**
     * Mask billing number for logging (show only last 4 digits)
     */
    private String maskBillingNumber(String billingNumber) {
        if (billingNumber == null || billingNumber.length() <= 4) {
            return "****";
        }
        return "**********" + billingNumber.substring(billingNumber.length() - 4);
    }
    
    /**
     * Create HTTP Headers for DHL API
     */
    private HttpHeaders createHeaders(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(bearerToken);
        return headers;
    }
}
