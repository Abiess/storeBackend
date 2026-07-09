package storebackend.service.dhl;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlTokenResponse;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * DHL Connection Test Service
 * 
 * Testet DHL Verbindung mit Store-spezifischen oder globalen Credentials
 * OHNE Label zu erzeugen (kostenfrei)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlConnectionTestService {
    
    private final DhlProperties globalDhlProperties;
    private final DhlSettingsResolver dhlSettingsResolver;
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Testet DHL Verbindung für einen Store
     * 
     * @param storeId Store ID
     * @return Test Result Map mit success, error, messageKey etc.
     */
    public Map<String, Object> testConnection(Long storeId) {
        Map<String, Object> response = new LinkedHashMap<>();
        
        try {
            // 1. Resolve Store-spezifische oder globale DHL Config
            DhlSettingsResolver.ResolvedDhlConfig config = dhlSettingsResolver.resolve(storeId);
            
            if (config == null) {
                response.put("success", false);
                response.put("error", "DHL_NOT_CONFIGURED");
                response.put("messageKey", "shipping.dhl.notConfigured");
                response.put("message", "DHL is not configured for this store");
                return response;
            }
            
            // PRODUCTION ohne Store Credentials → Fehler
            if ("PRODUCTION".equalsIgnoreCase(config.getEnvironment()) && "ENV".equals(config.getSource())) {
                response.put("success", false);
                response.put("error", "PRODUCTION_CREDENTIALS_MISSING");
                response.put("messageKey", "shipping.dhl.productionCredentialsMissing");
                response.put("message", "Production DHL requires store-specific credentials");
                return response;
            }
            
            response.put("configSource", config.getSource());
            response.put("environment", config.getEnvironment());
            
            // 2. Test Auth (Token abrufen)
            String token;
            try {
                token = fetchTestToken(config);
                response.put("authSuccess", true);
                response.put("tokenReceived", token != null && !token.isEmpty());
                log.info("✅ DHL Auth successful for store {} (env: {}, source: {})", 
                    storeId, config.getEnvironment(), config.getSource());
            } catch (Exception e) {
                log.error("❌ DHL Auth failed for store {}: {}", storeId, e.getMessage());
                response.put("success", false);
                response.put("authSuccess", false);
                response.put("error", "AUTH_FAILED");
                response.put("messageKey", "shipping.dhl.authFailed");
                response.put("message", "DHL authentication failed: " + e.getMessage());
                return response;
            }
            
            // 3. Test Shipping API Erreichbarkeit (Health Check)
            try {
                String apiBaseUrl = getShippingApiBaseUrl(config.getEnvironment());
                JsonNode apiInfo = testShippingApi(apiBaseUrl, token);
                response.put("apiReachable", true);
                response.put("apiVersion", apiInfo != null && apiInfo.has("version") ? apiInfo.get("version").asText() : "unknown");
                log.info("✅ DHL Shipping API reachable for store {}", storeId);
            } catch (Exception e) {
                log.error("❌ DHL Shipping API unreachable for store {}: {}", storeId, e.getMessage());
                response.put("success", false);
                response.put("apiReachable", false);
                response.put("error", "API_UNREACHABLE");
                response.put("messageKey", "shipping.dhl.apiUnreachable");
                response.put("message", "DHL Shipping API unreachable: " + e.getMessage());
                return response;
            }
            
            // All OK!
            response.put("success", true);
            response.put("messageKey", "shipping.dhl.connectionSuccess");
            response.put("message", "DHL connection test successful ✅");
            
            log.info("✅ DHL Connection Test successful for store {} (env: {}, source: {})", 
                storeId, config.getEnvironment(), config.getSource());
            return response;
            
        } catch (Exception e) {
            log.error("❌ DHL Connection Test failed for store {}", storeId, e);
            response.put("success", false);
            response.put("error", "TEST_FAILED");
            response.put("messageKey", "shipping.dhl.connectionFailed");
            response.put("message", "Connection test failed: " + e.getMessage());
            return response;
        }
    }
    
    /**
     * Holt Token mit Store-spezifischen Credentials (ohne Cache)
     */
    private String fetchTestToken(DhlSettingsResolver.ResolvedDhlConfig config) {
        String authUrl = getAuthUrl(config.getEnvironment());
        
        // Request Body: x-www-form-urlencoded
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", config.getClientId());
        body.add("client_secret", config.getClientSecret());
        
        // Username/Password
        if (config.isSandbox()) {
            // Sandbox: Nutze config username/password oder fallback zu global
            String username = config.getUsername() != null 
                ? config.getUsername() 
                : globalDhlProperties.getSandboxUsername();
            String password = config.getPassword() != null 
                ? config.getPassword() 
                : globalDhlProperties.getSandboxPassword();
            
            body.add("username", username);
            body.add("password", password);
        } else {
            // Production: MUSS Store-Credentials haben
            if (config.getUsername() == null || config.getPassword() == null) {
                throw new IllegalStateException("Production DHL requires username and password");
            }
            body.add("username", config.getUsername());
            body.add("password", config.getPassword());
        }
        
        // Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        
        // POST Request
        ResponseEntity<DhlTokenResponse> response = restTemplate.exchange(
            authUrl,
            HttpMethod.POST,
            request,
            DhlTokenResponse.class
        );
        
        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            return response.getBody().getAccessToken();
        }
        
        throw new RuntimeException("DHL Auth failed: " + response.getStatusCode());
    }
    
    /**
     * Testet Shipping API Erreichbarkeit (kein Label erstellen)
     */
    private JsonNode testShippingApi(String apiBaseUrl, String token) {
        // Simple GET Request zum API Root (health check)
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Void> request = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                apiBaseUrl,
                HttpMethod.GET,
                request,
                JsonNode.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            log.warn("Shipping API health check failed (trying HEAD request): {}", e.getMessage());
            
            // Fallback: HEAD Request
            try {
                ResponseEntity<Void> headResponse = restTemplate.exchange(
                    apiBaseUrl,
                    HttpMethod.HEAD,
                    request,
                    Void.class
                );
                
                if (headResponse.getStatusCode().is2xxSuccessful()) {
                    log.info("API reachable via HEAD request");
                    return null; // OK but no version info
                }
            } catch (Exception e2) {
                log.error("API not reachable via HEAD: {}", e2.getMessage());
            }
            
            throw new RuntimeException("Shipping API unreachable", e);
        }
    }
    
    private String getAuthUrl(String environment) {
        if ("PRODUCTION".equalsIgnoreCase(environment)) {
            return "https://api.dhl.com/parcel/de/account/auth/ropc/v1/token";
        } else {
            return "https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token";
        }
    }
    
    private String getShippingApiBaseUrl(String environment) {
        if ("PRODUCTION".equalsIgnoreCase(environment)) {
            return "https://api.dhl.com/parcel/de/shipping/v2";
        } else {
            return "https://api-sandbox.dhl.com/parcel/de/shipping/v2";
        }
    }
}
