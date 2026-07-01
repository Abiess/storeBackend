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
            
            // Sanitized logging (NO personal data!)
            DhlShipmentRequest.Shipment shipment = request.getShipments().get(0);
            DhlShipmentRequest.Address shipper = shipment.getShipper();
            DhlShipmentRequest.Address consignee = shipment.getConsignee();
            DhlShipmentRequest.Details details = shipment.getDetails();
            
            log.info("📦 Creating DHL shipment: refNo={}, product={}, billingNumber={}, " +
                    "shipper={}/{}/{}, consignee={}/{}/{}, weight={}{}, dim={}x{}x{}{}, env={}",
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
                dhlProperties.getEnv()
            );
            
            // DEBUG: Structural dump (Feldtypen, keine Werte!)
            log.debug("🔍 DHL Request Structure:");
            log.debug("  profile={} (String)", request.getProfile());
            log.debug("  shipments[0].product={} (String)", shipment.getProduct());
            log.debug("  shipments[0].billingNumber=***0102 (String, length={})", 
                shipment.getBillingNumber().length());
            log.debug("  shipments[0].refNo={} (String)", shipment.getRefNo());
            log.debug("  shipments[0].shipDate={} ({})", 
                shipment.getShipDate() != null ? "set" : "null",
                shipment.getShipDate() != null ? "String" : "omitted");
            log.debug("  shipments[0].shipper.name1={} (String, length={})", 
                shipper.getName1() != null ? "set" : "null",
                shipper.getName1() != null ? shipper.getName1().length() : 0);
            log.debug("  shipments[0].shipper.country={} ({})", 
                shipper.getCountry(),
                shipper.getCountry() != null ? "String" : "null");
            log.debug("  shipments[0].shipper.email={} ({})", 
                shipper.getEmail() != null ? "set" : "null",
                shipper.getEmail() != null ? "String" : "omitted");
            log.debug("  shipments[0].consignee.country={} ({})", 
                consignee.getCountry(),
                consignee.getCountry() != null ? "String" : "null");
            log.debug("  shipments[0].details.weight.value={} ({})", 
                details.getWeight().getValue(),
                details.getWeight().getValue().getClass().getSimpleName());
            log.debug("  shipments[0].details.weight.uom={} (String)", 
                details.getWeight().getUom());
            log.debug("  shipments[0].details.dim.height={} ({})", 
                details.getDim().getHeight(),
                details.getDim().getHeight().getClass().getSimpleName());
            log.debug("  shipments[0].details.dim.uom={} (String)", 
                details.getDim().getUom());
            
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
                e.getStatusText() + " on " + e.getClass().getSimpleName().replace("HttpClientErrorException$", "") + 
                " request for \"" + dhlProperties.getShippingBaseUrl() + "/orders\": \"" + 
                dhlDetail + "\"", e);
            
        } catch (RestClientException e) {
            log.error("❌ DHL Shipping API Error: {}", e.getMessage());
            throw new RuntimeException("DHL Shipping API Error", e);
        }
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
