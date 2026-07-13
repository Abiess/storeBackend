package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlTokenResponse;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * DHL Auth Client - OAuth Token Management
 * API: POST /parcel/de/account/auth/ropc/v1/token
 * Grant Type: Resource Owner Password Credentials (ROPC)
 * 
 * Multi-Store Support:
 * - Token Cache pro (environment + credentialsSource + clientId + username)
 * - Store-spezifische Credentials werden unterstützt
 * - Platform Credentials werden unterstützt
 * 
 * Security:
 * - Keine Tokens loggen
 * - Keine clientSecret/password loggen
 * - Nur config.getLoggingInfo() für Audit
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlAuthClient {
    
    private final DhlProperties dhlProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Multi-Store Token Cache
     * Key = cacheKey(environment, credentialsSource, clientId, username)
     * Value = DhlTokenResponse
     */
    private final Map<String, DhlTokenResponse> tokenCache = new ConcurrentHashMap<>();
    
    /**
     * Hole gültigen Access Token für resolved Config
     * 
     * EMPFOHLEN: Nutze diese Methode für store-aware Token-Management
     * 
     * @param config Resolved DHL Config aus DhlSettingsResolver
     * @return Access Token
     */
    public synchronized String getAccessToken(DhlSettingsResolver.ResolvedDhlConfig config) {
        String cacheKey = buildCacheKey(config);
        
        // Token aus Cache wenn noch gültig
        DhlTokenResponse cached = tokenCache.get(cacheKey);
        if (cached != null && cached.isValid()) {
            log.debug("Using cached DHL token for {} (expires in {} seconds)", 
                cacheKey, getRemainingSeconds(cached));
            return cached.getAccessToken();
        }
        
        // Token neu holen
        log.info("Fetching new DHL token for config: {}", config.getLoggingInfo());
        DhlTokenResponse token = fetchTokenWithConfig(config);
        tokenCache.put(cacheKey, token);
        
        log.info("✅ DHL token fetched successfully (expires in {} seconds) for {}", 
            token.getExpiresIn(), cacheKey);
        
        return token.getAccessToken();
    }
    
    /**
     * Hole gültigen Access Token (aus Cache oder neu holen)
     * 
     * @deprecated Nutze stattdessen getAccessToken(ResolvedDhlConfig config)
     *             Diese Methode unterstützt nur globale Properties, nicht store-spezifisch
     */
    @Deprecated
    public synchronized String getAccessToken() {
        log.warn("Using deprecated getAccessToken() without config parameter. " +
            "Consider using getAccessToken(ResolvedDhlConfig config) for store-aware token management.");
        
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        // Baue minimale Config aus globalen Properties
        DhlSettingsResolver.ResolvedDhlConfig globalConfig = new DhlSettingsResolver.ResolvedDhlConfig();
        globalConfig.setCredentialsSource("DEPRECATED");
        globalConfig.setEnvironment(dhlProperties.getEnv());
        globalConfig.setClientId(dhlProperties.getClientId());
        globalConfig.setClientSecret(dhlProperties.getClientSecret());
        
        if (dhlProperties.isSandbox()) {
            globalConfig.setUsername(dhlProperties.getSandboxUsername());
            globalConfig.setPassword(dhlProperties.getSandboxPassword());
        } else {
            throw new UnsupportedOperationException(
                "Production mode requires store-specific config. " +
                "Use getAccessToken(ResolvedDhlConfig config) instead."
            );
        }
        
        return getAccessToken(globalConfig);
    }
    
    /**
     * Hole neuen Token mit resolved Config
     */
    private DhlTokenResponse fetchTokenWithConfig(DhlSettingsResolver.ResolvedDhlConfig config) {
        String authUrl = config.getAuthUrl();
        
        try {
            // Request Body: x-www-form-urlencoded
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "password");
            body.add("client_id", config.getClientId());
            body.add("client_secret", config.getClientSecret());
            body.add("username", config.getUsername());
            body.add("password", config.getPassword());
            
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
                DhlTokenResponse token = response.getBody();
                token.setFetchedAt(System.currentTimeMillis());
                return token;
            }
            
            throw new RuntimeException("DHL Auth failed: " + response.getStatusCode());
            
        } catch (HttpClientErrorException.Unauthorized e) {
            // 401: invalid_client oder invalid_grant
            String errorBody = e.getResponseBodyAsString();
            log.error("❌ DHL Auth failed (401 Unauthorized): {}", errorBody);
            
            if (errorBody.contains("invalid_client")) {
                throw new RuntimeException(
                    "DHL API Key invalid: Client ID or Client Secret is wrong or not activated. " +
                    "Please check your DHL Developer Portal credentials. " +
                    "messageKey: shipping.dhl.invalidClient", e
                );
            } else if (errorBody.contains("invalid_grant")) {
                throw new RuntimeException(
                    "DHL Business Customer credentials invalid: Username or Password is wrong. " +
                    "Please check your DHL Geschäftskunden login credentials. " +
                    "messageKey: shipping.dhl.invalidGrant", e
                );
            } else {
                throw new RuntimeException(
                    "DHL Authentication failed (401): " + errorBody + 
                    " messageKey: shipping.dhl.authFailed", e
                );
            }
            
        } catch (HttpClientErrorException e) {
            log.error("❌ DHL Auth failed ({}): {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException(
                "DHL Auth failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e
            );
            
        } catch (RestClientException e) {
            log.error("❌ DHL Auth API Error: {}", e.getMessage());
            throw new RuntimeException("Failed to authenticate with DHL API", e);
        }
    }
    
    /**
     * Invalidate cached token für specific config (z.B. bei 401 Unauthorized)
     */
    public synchronized void invalidateToken(DhlSettingsResolver.ResolvedDhlConfig config) {
        String cacheKey = buildCacheKey(config);
        log.warn("Invalidating cached DHL token for {}", cacheKey);
        tokenCache.remove(cacheKey);
    }
    
    /**
     * Invalidate cached token (alte Methode - deprecated)
     * 
     * @deprecated Nutze stattdessen invalidateToken(ResolvedDhlConfig config)
     */
    @Deprecated
    public synchronized void invalidateToken() {
        log.warn("Invalidating ALL cached DHL tokens (deprecated method used)");
        tokenCache.clear();
    }
    
    /**
     * Baut Cache-Key aus Config
     * Format: environment:credentialsSource:clientId:username
     * 
     * Wichtig: clientId wird maskiert geloggt, nicht der volle Key!
     */
    private String buildCacheKey(DhlSettingsResolver.ResolvedDhlConfig config) {
        return String.format("%s:%s:%s:%s",
            config.getEnvironment(),
            config.getCredentialsSource(),
            config.getClientId(),
            config.getUsername()
        );
    }
    
    /**
     * Verbleibende Sekunden bis Token abläuft
     */
    private int getRemainingSeconds(DhlTokenResponse token) {
        if (token == null || token.getExpiresIn() == null) {
            return 0;
        }
        long now = System.currentTimeMillis();
        long expiresAt = token.getFetchedAt() + ((long) token.getExpiresIn() * 1000);
        long remaining = (expiresAt - now) / 1000;
        return (int) Math.max(0, remaining);
    }
}
