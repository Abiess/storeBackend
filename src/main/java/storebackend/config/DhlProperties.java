package storebackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * DHL Parcel DE Shipping API Configuration
 * Dokumentation: https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2
 */
@Configuration
@ConfigurationProperties(prefix = "dhl")
@Data
public class DhlProperties {
    
    /**
     * DHL Integration aktiviert/deaktiviert
     */
    private boolean enabled = false;
    
    /**
     * Environment: sandbox | production
     */
    private String env = "sandbox";
    
    /**
     * DHL Client ID (aus Developer Portal)
     */
    private String clientId;
    
    /**
     * DHL Client Secret (aus Developer Portal)
     */
    private String clientSecret;
    
    /**
     * Auth URL (OAuth ROPC Token Endpoint)
     * Sandbox: https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token
     * Production: https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token
     */
    private String authUrl;
    
    /**
     * Shipping API Base URL
     * Sandbox: https://api-sandbox.dhl.com/parcel/de/shipping/v2
     * Production: https://api-eu.dhl.com/parcel/de/shipping/v2
     */
    private String shippingBaseUrl;
    
    /**
     * Sandbox Username (nur für Sandbox)
     */
    private String sandboxUsername;
    
    /**
     * Sandbox Password (nur für Sandbox)
     */
    private String sandboxPassword;
    
    /**
     * Default DHL Profil (z.B. STANDARD_GRUPPENPROFIL)
     */
    private String defaultProfile = "STANDARD_GRUPPENPROFIL";
    
    /**
     * Default Produkt Code (z.B. V01PAK = DHL Paket)
     */
    private String defaultProduct = "V01PAK";
    
    /**
     * Default Billing Number (Abrechnungsnummer)
     * Format: 14 Ziffern (2 Ziffern EKP + 10 Ziffern Teilnahmenummer + 2 Ziffern Produkt)
     */
    private String defaultBillingNumber;
    
    /**
     * HTTP Timeout in Millisekunden
     */
    private int timeout = 30000;
    
    /**
     * Token Cache Duration in Sekunden (Standard: 23 Stunden)
     */
    private int tokenCacheDuration = 82800;
    
    /**
     * Ist Sandbox Mode aktiv?
     */
    public boolean isSandbox() {
        return "sandbox".equalsIgnoreCase(env);
    }
    
    /**
     * Validierung der Properties
     */
    public void validate() {
        if (!enabled) {
            return; // Keine Validierung nötig wenn deaktiviert
        }
        
        if (clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("DHL Client ID is required when dhl.enabled=true");
        }
        
        if (clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException("DHL Client Secret is required when dhl.enabled=true");
        }
        
        if (isSandbox()) {
            if (sandboxUsername == null || sandboxUsername.isBlank()) {
                throw new IllegalStateException("DHL Sandbox Username is required in sandbox mode");
            }
            if (sandboxPassword == null || sandboxPassword.isBlank()) {
                throw new IllegalStateException("DHL Sandbox Password is required in sandbox mode");
            }
        }
        
        if (defaultBillingNumber == null || defaultBillingNumber.isBlank()) {
            throw new IllegalStateException("DHL Default Billing Number is required");
        }
    }
}
