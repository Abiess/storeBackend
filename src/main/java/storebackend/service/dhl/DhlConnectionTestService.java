package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import storebackend.entity.StoreDeliverySettings;
import storebackend.exception.DhlConfigurationException;
import storebackend.repository.StoreDeliverySettingsRepository;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * DHL Connection Test Service
 * 
 * Testet DHL Verbindung OHNE Label zu erzeugen (kostenfrei).
 * 
 * Ablauf:
 * 1. Store Settings laden
 * 2. DhlSettingsResolver.resolve() nutzen (wie Validate/Label)
 * 3. Token abrufen über DhlAuthClient (wie Validate/Label)
 * 4. Success oder klare Fehlermeldung
 * 
 * WICHTIG:
 * - Verwendet EXAKT dieselbe Credential-Entscheidung wie Label/Validate
 * - Keine eigene Token-Logik
 * - Keine Secrets in Response
 * - Logging nur mit config.getLoggingInfo()
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlConnectionTestService {
    
    private final DhlSettingsResolver dhlSettingsResolver;
    private final DhlAuthClient dhlAuthClient;
    private final StoreDeliverySettingsRepository deliverySettingsRepository;
    
    /**
     * Testet DHL Verbindung für einen Store
     * 
     * Nutzt dieselbe Resolver-Logik wie Label/Validate.
     * Holt nur Token über DhlAuthClient (keine Label-Erstellung).
     * 
     * @param storeId Store ID
     * @return Test Result Map mit success, error, messageKey, credentialsSource etc.
     */
    public Map<String, Object> testConnection(Long storeId) {
        Map<String, Object> response = new LinkedHashMap<>();
        
        try {
            // 1. Store Settings laden
            StoreDeliverySettings settings = deliverySettingsRepository.findByStoreId(storeId)
                .orElse(null);
            
            // 2. Resolve DHL Config (wie Label/Validate)
            DhlSettingsResolver.ResolvedDhlConfig config;
            try {
                config = dhlSettingsResolver.resolve(storeId);
            } catch (DhlConfigurationException e) {
                log.warn("❌ DHL Config failed for store {}: {}", storeId, e.getMessageKey());
                response.put("success", false);
                response.put("messageKey", e.getMessageKey());
                response.put("message", e.getMessage());
                
                // Security Flags für UI
                addSecurityFlags(response, settings);
                
                return response;
            } catch (Exception e) {
                log.error("❌ DHL Config failed for store {}", storeId, e);
                response.put("success", false);
                response.put("messageKey", "shipping.dhl.connectionFailed");
                response.put("message", "Configuration error: " + e.getMessage());
                
                // Security Flags für UI
                addSecurityFlags(response, settings);
                
                return response;
            }
            
            // 3. Credentials Source und Environment
            response.put("environment", config.getEnvironment());
            response.put("credentialsSource", config.getCredentialsSource());
            
            log.debug("🧪 DHL Connection Test for store {} | {}", storeId, config.getLoggingInfo());
            
            // 4. Token abrufen (wie Label/Validate)
            try {
                String token = dhlAuthClient.getAccessToken(config);
                
                if (token == null || token.isEmpty()) {
                    log.error("❌ DHL Auth returned null/empty token for store {}", storeId);
                    response.put("success", false);
                    response.put("messageKey", "shipping.dhl.authFailed");
                    response.put("message", "Authentication failed: No token received");
                    
                    addSecurityFlags(response, settings);
                    return response;
                }
                
                // SUCCESS ✅
                response.put("success", true);
                response.put("messageKey", "shipping.dhl.connectionSuccess");
                response.put("message", "DHL connection test successful ✅");
                
                log.info("✅ DHL Connection Test successful for store {} | {}", 
                    storeId, config.getLoggingInfo());
                
            } catch (HttpClientErrorException.Unauthorized e) {
                // 401: Client ID/Secret oder Username/Password falsch
                String errorBody = e.getResponseBodyAsString();
                
                if (errorBody.contains("invalid_client")) {
                    log.error("❌ DHL Auth failed for store {}: invalid_client (API Key/Secret wrong or not activated)", storeId);
                    response.put("success", false);
                    response.put("messageKey", "shipping.dhl.invalidClient");
                    response.put("message", "API credentials are wrong or not activated. Check Client ID / Client Secret.");
                } else if (errorBody.contains("invalid_grant")) {
                    log.error("❌ DHL Auth failed for store {}: invalid_grant (Username/Password wrong)", storeId);
                    response.put("success", false);
                    response.put("messageKey", "shipping.dhl.invalidGrant");
                    response.put("message", "DHL business customer credentials are wrong. Check Username / Password.");
                } else {
                    log.error("❌ DHL Auth failed for store {}: {} - {}", storeId, e.getStatusCode(), errorBody);
                    response.put("success", false);
                    response.put("messageKey", "shipping.dhl.authFailed");
                    response.put("message", "Authentication failed: " + e.getMessage());
                }
                
            } catch (Exception e) {
                log.error("❌ DHL Auth failed for store {}", storeId, e);
                response.put("success", false);
                response.put("messageKey", "shipping.dhl.authFailed");
                response.put("message", "Authentication failed: " + e.getMessage());
            }
            
            // Security Flags für UI
            addSecurityFlags(response, settings);
            
            return response;
            
        } catch (Exception e) {
            log.error("❌ DHL Connection Test failed for store {}", storeId, e);
            
            Map<String, Object> errorResponse = new LinkedHashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("messageKey", "shipping.dhl.connectionFailed");
            errorResponse.put("message", "Connection test failed: " + e.getMessage());
            
            // Security Flags für UI
            StoreDeliverySettings settings = deliverySettingsRepository.findByStoreId(storeId)
                .orElse(null);
            addSecurityFlags(errorResponse, settings);
            
            return errorResponse;
        }
    }
    
    /**
     * Fügt Security Flags zur Response hinzu (KEINE Secrets, nur Flags)
     * 
     * Für UI:
     * - passwordConfigured: ja/nein
     * - clientSecretConfigured: ja/nein
     * - platformCredentialsAvailable: ja/nein
     */
    private void addSecurityFlags(Map<String, Object> response, StoreDeliverySettings settings) {
        if (settings != null) {
            response.put("passwordConfigured", 
                settings.getDhlPassword() != null && !settings.getDhlPassword().isEmpty());
            response.put("clientSecretConfigured", 
                settings.getDhlClientSecret() != null && !settings.getDhlClientSecret().isEmpty());
        } else {
            response.put("passwordConfigured", false);
            response.put("clientSecretConfigured", false);
        }
        
        // Platform Credentials available?
        try {
            DhlSettingsResolver.ResolvedDhlConfig testConfig = dhlSettingsResolver.resolve(null);
            response.put("platformCredentialsAvailable", 
                "PLATFORM".equals(testConfig.getCredentialsSource()));
        } catch (Exception e) {
            response.put("platformCredentialsAvailable", false);
        }
    }
}
