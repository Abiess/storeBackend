package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import storebackend.config.DhlProperties;
import storebackend.dto.dhl.DhlTokenResponse;

/**
 * DHL Auth Client - OAuth Token Management
 * API: POST /parcel/de/account/auth/ropc/v1/token
 * Grant Type: Resource Owner Password Credentials (ROPC)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlAuthClient {
    
    private final DhlProperties dhlProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Cached Token (in-memory)
     */
    private DhlTokenResponse cachedToken;
    
    /**
     * Hole gültigen Access Token (aus Cache oder neu holen)
     */
    public synchronized String getAccessToken() {
        if (!dhlProperties.isEnabled()) {
            throw new IllegalStateException("DHL Integration is disabled");
        }
        
        // Token aus Cache wenn noch gültig
        if (cachedToken != null && cachedToken.isValid()) {
            log.debug("Using cached DHL token (expires in {} seconds)", 
                getRemainingSeconds(cachedToken));
            return cachedToken.getAccessToken();
        }
        
        // Token neu holen
        log.info("Fetching new DHL access token from: {}", dhlProperties.getAuthUrl());
        cachedToken = fetchNewToken();
        log.info("✅ DHL token fetched successfully (expires in {} seconds)", 
            cachedToken.getExpiresIn());
        
        return cachedToken.getAccessToken();
    }
    
    /**
     * Hole neuen Token von DHL Auth API
     */
    private DhlTokenResponse fetchNewToken() {
        try {
            // Request Body: x-www-form-urlencoded
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "password");
            body.add("client_id", dhlProperties.getClientId());
            body.add("client_secret", dhlProperties.getClientSecret());
            
            // Sandbox: user-valid / SandboxPasswort2023!
            // Production: Echte DHL Geschäftskunden-Credentials
            if (dhlProperties.isSandbox()) {
                body.add("username", dhlProperties.getSandboxUsername());
                body.add("password", dhlProperties.getSandboxPassword());
            } else {
                throw new UnsupportedOperationException(
                    "Production credentials not yet implemented. " +
                    "Add DHL_PRODUCTION_USERNAME and DHL_PRODUCTION_PASSWORD to DhlProperties."
                );
            }
            
            // Headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            
            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            
            // POST Request
            ResponseEntity<DhlTokenResponse> response = restTemplate.exchange(
                dhlProperties.getAuthUrl(),
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
            
        } catch (RestClientException e) {
            log.error("❌ DHL Auth API Error: {}", e.getMessage());
            throw new RuntimeException("Failed to authenticate with DHL API", e);
        }
    }
    
    /**
     * Invalidate cached token (z.B. bei 401 Unauthorized)
     */
    public synchronized void invalidateToken() {
        log.warn("Invalidating cached DHL token");
        cachedToken = null;
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
