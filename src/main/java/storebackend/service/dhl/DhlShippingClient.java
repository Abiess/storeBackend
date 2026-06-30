package storebackend.service.dhl;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlShipmentRequest;
import storebackend.dto.dhl.DhlShipmentResponse;

/**
 * DHL Shipping Client - Label Creation & Validation
 * API: /parcel/de/shipping/v2
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
     */
    public DhlShipmentResponse validateShipment(DhlShipmentRequest request) {
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        try {
            String url = dhlProperties.getShippingBaseUrl() + "/orders?validate=true";
            String token = dhlAuthClient.getAccessToken();
            
            HttpHeaders headers = createHeaders(token);
            HttpEntity<DhlShipmentRequest> httpRequest = new HttpEntity<>(request, headers);
            
            log.info("🔍 Validating DHL shipment for refNo: {}", 
                request.getShipments().get(0).getRefNo());
            
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
            dhlAuthClient.invalidateToken();
            return validateShipment(request); // Retry
            
        } catch (HttpClientErrorException e) {
            log.error("❌ DHL Validation failed with status {}: {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("DHL Validation failed: " + e.getMessage(), e);
            
        } catch (RestClientException e) {
            log.error("❌ DHL Validation API Error: {}", e.getMessage());
            throw new RuntimeException("DHL Validation API Error", e);
        }
    }
    
    /**
     * Create Shipment Label
     * POST /orders
     */
    public DhlShipmentResponse createLabel(DhlShipmentRequest request) {
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        try {
            String url = dhlProperties.getShippingBaseUrl() + "/orders";
            String token = dhlAuthClient.getAccessToken();
            
            HttpHeaders headers = createHeaders(token);
            HttpEntity<DhlShipmentRequest> httpRequest = new HttpEntity<>(request, headers);
            
            log.info("📦 Creating DHL shipment for refNo: {}", 
                request.getShipments().get(0).getRefNo());
            
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
            dhlAuthClient.invalidateToken();
            return createLabel(request); // Retry
            
        } catch (HttpClientErrorException e) {
            log.error("❌ DHL Shipment creation failed with status {}: {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("DHL Shipment creation failed: " + e.getMessage(), e);
            
        } catch (RestClientException e) {
            log.error("❌ DHL Shipping API Error: {}", e.getMessage());
            throw new RuntimeException("DHL Shipping API Error", e);
        }
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
