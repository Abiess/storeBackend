package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.config.DhlProperties;
import storebackend.entity.StoreDeliverySettings;
import storebackend.repository.StoreDeliverySettingsRepository;

/**
 * DHL Settings Resolver
 * 
 * Priorisierung:
 * 1. Store-spezifische DHL Settings (wenn dhlEnabled=true und vollständig konfiguriert)
 * 2. Globale ENV Settings (Fallback für Sandbox/Test)
 * 3. DHL nicht verfügbar
 * 
 * Verwendung:
 * - DhlLabelService nutzt diesen Resolver um Credentials + Shipper-Adresse zu laden
 * - Ermöglicht pro-Store DHL Konfiguration (eigene Abrechnungsnummer)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlSettingsResolver {
    
    private final StoreDeliverySettingsRepository deliverySettingsRepository;
    private final DhlProperties globalDhlProperties;
    
    /**
     * Resolved DHL Config für einen Store
     * 
     * SICHERHEIT Production vs Sandbox:
     * - Sandbox: Darf globale ENV Credentials nutzen (für Testing)
     * - Production: MUSS store-spezifische Credentials haben (keine globale Fallback)
     * 
     * @param storeId Store ID
     * @return ResolvedDhlConfig oder null wenn DHL nicht verfügbar
     */
    public ResolvedDhlConfig resolve(Long storeId) {
        // 1. Versuche Store-spezifische Settings zu laden
        StoreDeliverySettings storeSettings = deliverySettingsRepository
            .findByStoreId(storeId)
            .orElse(null);
        
        if (storeSettings != null && Boolean.TRUE.equals(storeSettings.getDhlEnabled())) {
            if (isStoreConfigComplete(storeSettings)) {
                log.debug("✅ Using store-specific DHL config for store {}", storeId);
                return buildStoreConfig(storeSettings);
            } else {
                // Store hat DHL aktiviert aber config unvollständig
                String environment = storeSettings.getDhlEnvironment();
                
                // PRODUCTION: Kein Fallback erlaubt!
                if ("PRODUCTION".equalsIgnoreCase(environment)) {
                    log.error("❌ Store {} has DHL PRODUCTION enabled but config incomplete. " +
                        "Production requires store-specific credentials. No fallback allowed!", storeId);
                    return null; // → Wird in Services zu "storeCredentialsRequired" Error
                }
                
                log.warn("⚠️ Store {} has DHL enabled but config incomplete. Falling back to global ENV.", 
                    storeId);
            }
        }
        
        // 2. Fallback: Globale ENV Settings (NUR für Sandbox!)
        if (globalDhlProperties.isEnabled()) {
            // SICHERHEIT: Production ENV Settings dürfen nicht als Fallback genutzt werden
            if (!"SANDBOX".equalsIgnoreCase(globalDhlProperties.getEnv())) {
                log.error("❌ Global ENV is PRODUCTION but store {} has no store-specific config. " +
                    "Production DHL requires store-specific credentials!", storeId);
                return null;
            }
            
            log.debug("⚡ Using global SANDBOX ENV DHL config for store {} (env: {})", 
                storeId, globalDhlProperties.getEnv());
            return buildGlobalConfig();
        }
        
        // 3. DHL nicht verfügbar
        log.debug("❌ DHL not configured for store {}", storeId);
        return null;
    }
    
    /**
     * Prüft ob Store DHL Config vollständig ist
     */
    private boolean isStoreConfigComplete(StoreDeliverySettings settings) {
        // Credentials erforderlich
        if (isBlank(settings.getDhlClientId()) || isBlank(settings.getDhlClientSecret())) {
            return false;
        }
        
        // Production Mode → Username/Password erforderlich
        if ("PRODUCTION".equalsIgnoreCase(settings.getDhlEnvironment())) {
            if (isBlank(settings.getDhlUsername()) || isBlank(settings.getDhlPassword())) {
                return false;
            }
        }
        
        // Shipper Adresse erforderlich (für Label-Erstellung)
        if (isBlank(settings.getDhlShipperName()) || 
            isBlank(settings.getDhlShipperStreet()) || 
            isBlank(settings.getDhlShipperCity()) || 
            isBlank(settings.getDhlShipperPostalCode()) || 
            isBlank(settings.getDhlShipperCountry())) {
            return false;
        }
        
        return true;
    }
    
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
    
    /**
     * Baut Store-spezifische Config
     */
    private ResolvedDhlConfig buildStoreConfig(StoreDeliverySettings settings) {
        ResolvedDhlConfig config = new ResolvedDhlConfig();
        config.setSource("STORE");
        config.setEnvironment(settings.getDhlEnvironment());
        config.setClientId(settings.getDhlClientId());
        config.setClientSecret(settings.getDhlClientSecret());
        config.setUsername(settings.getDhlUsername());
        config.setPassword(settings.getDhlPassword());
        config.setBillingNumber(settings.getDhlBillingNumber());
        
        // Shipper Address
        config.setShipperName(settings.getDhlShipperName());
        config.setShipperStreet(settings.getDhlShipperStreet());
        config.setShipperHouseNumber(settings.getDhlShipperHouseNumber());
        config.setShipperPostalCode(settings.getDhlShipperPostalCode());
        config.setShipperCity(settings.getDhlShipperCity());
        config.setShipperCountry(settings.getDhlShipperCountry());
        config.setShipperEmail(settings.getDhlShipperEmail());
        config.setShipperPhone(settings.getDhlShipperPhone());
        
        // Package Defaults (oder global Fallback)
        config.setDefaultWeightGrams(
            settings.getDhlDefaultWeightGrams() != null 
                ? settings.getDhlDefaultWeightGrams() 
                : globalDhlProperties.getDefaultWeightGrams()
        );
        config.setDefaultLengthMm(
            settings.getDhlDefaultLengthMm() != null 
                ? settings.getDhlDefaultLengthMm() 
                : globalDhlProperties.getDefaultLengthMm()
        );
        config.setDefaultWidthMm(
            settings.getDhlDefaultWidthMm() != null 
                ? settings.getDhlDefaultWidthMm() 
                : globalDhlProperties.getDefaultWidthMm()
        );
        config.setDefaultHeightMm(
            settings.getDhlDefaultHeightMm() != null 
                ? settings.getDhlDefaultHeightMm() 
                : globalDhlProperties.getDefaultHeightMm()
        );
        
        return config;
    }
    
    /**
     * Baut globale ENV Config
     */
    private ResolvedDhlConfig buildGlobalConfig() {
        ResolvedDhlConfig config = new ResolvedDhlConfig();
        config.setSource("ENV");
        config.setEnvironment(globalDhlProperties.getEnv());
        config.setClientId(globalDhlProperties.getClientId());
        config.setClientSecret(globalDhlProperties.getClientSecret());
        
        // Sandbox Credentials (optional)
        if (globalDhlProperties.isSandbox()) {
            config.setUsername(globalDhlProperties.getSandboxUsername());
            config.setPassword(globalDhlProperties.getSandboxPassword());
            
            // Sandbox Shipper Address
            config.setShipperName(globalDhlProperties.getSandboxShipperName());
            config.setShipperStreet(globalDhlProperties.getSandboxShipperStreet());
            config.setShipperHouseNumber(globalDhlProperties.getSandboxShipperHouseNumber());
            config.setShipperPostalCode(globalDhlProperties.getSandboxShipperPostalCode());
            config.setShipperCity(globalDhlProperties.getSandboxShipperCity());
            config.setShipperCountry(globalDhlProperties.getSandboxShipperCountry());
        }
        
        config.setBillingNumber(globalDhlProperties.getDefaultBillingNumber());
        
        // Package Defaults
        config.setDefaultWeightGrams(globalDhlProperties.getDefaultWeightGrams());
        config.setDefaultLengthMm(globalDhlProperties.getDefaultLengthMm());
        config.setDefaultWidthMm(globalDhlProperties.getDefaultWidthMm());
        config.setDefaultHeightMm(globalDhlProperties.getDefaultHeightMm());
        
        return config;
    }
    
    /**
     * Resolved DHL Configuration
     */
    public static class ResolvedDhlConfig {
        private String source; // "STORE" | "ENV"
        private String environment; // "SANDBOX" | "PRODUCTION"
        private String clientId;
        private String clientSecret;
        private String username;
        private String password;
        private String billingNumber;
        
        // Shipper Address
        private String shipperName;
        private String shipperStreet;
        private String shipperHouseNumber;
        private String shipperPostalCode;
        private String shipperCity;
        private String shipperCountry;
        private String shipperEmail;
        private String shipperPhone;
        
        // Package Defaults
        private Integer defaultWeightGrams;
        private Integer defaultLengthMm;
        private Integer defaultWidthMm;
        private Integer defaultHeightMm;

        // Getters & Setters
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        
        public String getEnvironment() { return environment; }
        public void setEnvironment(String environment) { this.environment = environment; }
        
        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        
        public String getClientSecret() { return clientSecret; }
        public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
        
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        
        public String getBillingNumber() { return billingNumber; }
        public void setBillingNumber(String billingNumber) { this.billingNumber = billingNumber; }
        
        public String getShipperName() { return shipperName; }
        public void setShipperName(String shipperName) { this.shipperName = shipperName; }
        
        public String getShipperStreet() { return shipperStreet; }
        public void setShipperStreet(String shipperStreet) { this.shipperStreet = shipperStreet; }
        
        public String getShipperHouseNumber() { return shipperHouseNumber; }
        public void setShipperHouseNumber(String shipperHouseNumber) { this.shipperHouseNumber = shipperHouseNumber; }
        
        public String getShipperPostalCode() { return shipperPostalCode; }
        public void setShipperPostalCode(String shipperPostalCode) { this.shipperPostalCode = shipperPostalCode; }
        
        public String getShipperCity() { return shipperCity; }
        public void setShipperCity(String shipperCity) { this.shipperCity = shipperCity; }
        
        public String getShipperCountry() { return shipperCountry; }
        public void setShipperCountry(String shipperCountry) { this.shipperCountry = shipperCountry; }
        
        public String getShipperEmail() { return shipperEmail; }
        public void setShipperEmail(String shipperEmail) { this.shipperEmail = shipperEmail; }
        
        public String getShipperPhone() { return shipperPhone; }
        public void setShipperPhone(String shipperPhone) { this.shipperPhone = shipperPhone; }
        
        public Integer getDefaultWeightGrams() { return defaultWeightGrams; }
        public void setDefaultWeightGrams(Integer defaultWeightGrams) { this.defaultWeightGrams = defaultWeightGrams; }
        
        public Integer getDefaultLengthMm() { return defaultLengthMm; }
        public void setDefaultLengthMm(Integer defaultLengthMm) { this.defaultLengthMm = defaultLengthMm; }
        
        public Integer getDefaultWidthMm() { return defaultWidthMm; }
        public void setDefaultWidthMm(Integer defaultWidthMm) { this.defaultWidthMm = defaultWidthMm; }
        
        public Integer getDefaultHeightMm() { return defaultHeightMm; }
        public void setDefaultHeightMm(Integer defaultHeightMm) { this.defaultHeightMm = defaultHeightMm; }
        
        public boolean isSandbox() {
            return "SANDBOX".equalsIgnoreCase(environment);
        }
    }
}
