package storebackend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.config.DhlProperties;
import storebackend.service.dhl.DhlAuthClient;
import storebackend.service.dhl.DhlShippingClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * DHL Admin Controller
 * Endpoints für DHL Label-Erstellung und Health Checks
 */
@RestController
@RequestMapping("/api/admin/dhl")
@RequiredArgsConstructor
@Slf4j
public class DhlAdminController {
    
    private final DhlProperties dhlProperties;
    private final DhlAuthClient dhlAuthClient;
    private final DhlShippingClient dhlShippingClient;
    
    /**
     * Health Check: DHL Config + Auth + Shipping API
     * GET /api/admin/dhl/health
     * 
     * Zugriff: Alle authentifizierten User (Store Owner können DHL Status prüfen)
     */
    @GetMapping("/health")
    @PreAuthorize("isAuthenticated()")  // Jeder eingeloggte User
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> response = new LinkedHashMap<>();
        
        try {
            // 1. Check Config
            response.put("enabled", dhlProperties.isEnabled());
            response.put("env", dhlProperties.getEnv());
            response.put("authUrl", dhlProperties.getAuthUrl());
            response.put("shippingBaseUrl", dhlProperties.getShippingBaseUrl());
            
            if (!dhlProperties.isEnabled()) {
                response.put("status", "DISABLED");
                response.put("message", "DHL integration is disabled. Set DHL_ENABLED=true to activate.");
                return ResponseEntity.ok(response);
            }
            
            // 2. Validate Config
            try {
                dhlProperties.validate();
                response.put("configValid", true);
            } catch (IllegalStateException e) {
                response.put("configValid", false);
                response.put("configError", e.getMessage());
                response.put("status", "CONFIG_ERROR");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 3. Test Auth
            try {
                String token = dhlAuthClient.getAccessToken();
                response.put("authStatus", "OK");
                response.put("tokenLength", token != null ? token.length() : 0);
            } catch (Exception e) {
                response.put("authStatus", "FAILED");
                response.put("authError", e.getMessage());
                response.put("status", "AUTH_ERROR");
                return ResponseEntity.status(500).body(response);
            }
            
            // 4. Test Shipping API
            try {
                JsonNode apiInfo = dhlShippingClient.healthCheck();
                response.put("shippingApiStatus", "OK");
                response.put("apiInfo", apiInfo);
            } catch (Exception e) {
                response.put("shippingApiStatus", "FAILED");
                response.put("shippingApiError", e.getMessage());
                response.put("status", "API_ERROR");
                return ResponseEntity.status(500).body(response);
            }
            
            // All OK!
            response.put("status", "HEALTHY");
            response.put("message", "DHL integration is working correctly ✅");
            
            log.info("✅ DHL Health Check successful");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ DHL Health Check failed", e);
            response.put("status", "ERROR");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Get DHL Config (ohne Secrets)
     * GET /api/admin/dhl/config
     * 
     * Zugriff: Alle authentifizierten User
     */
    @GetMapping("/config")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", dhlProperties.isEnabled());
        config.put("env", dhlProperties.getEnv());
        config.put("authUrl", dhlProperties.getAuthUrl());
        config.put("shippingBaseUrl", dhlProperties.getShippingBaseUrl());
        config.put("defaultProfile", dhlProperties.getDefaultProfile());
        config.put("defaultProduct", dhlProperties.getDefaultProduct());
        config.put("timeout", dhlProperties.getTimeout());
        config.put("clientIdSet", dhlProperties.getClientId() != null && !dhlProperties.getClientId().isBlank());
        config.put("clientSecretSet", dhlProperties.getClientSecret() != null && !dhlProperties.getClientSecret().isBlank());
        
        if (dhlProperties.isSandbox()) {
            config.put("sandboxUsernameSet", dhlProperties.getSandboxUsername() != null);
            config.put("sandboxPasswordSet", dhlProperties.getSandboxPassword() != null);
        }
        
        return ResponseEntity.ok(config);
    }
}
