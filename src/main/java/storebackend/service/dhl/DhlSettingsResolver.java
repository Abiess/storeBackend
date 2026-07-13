package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.config.DhlProperties;
import storebackend.entity.StoreDeliverySettings;
import storebackend.exception.DhlConfigurationException;
import storebackend.repository.StoreDeliverySettingsRepository;
import storebackend.service.SecretEncryptionService;

/**
 * DHL Settings Resolver
 * 
 * Zentrale Resolver-Logik für DHL Credentials.
 * Entscheidet welche Credentials (Sandbox/Store/Platform) verwendet werden.
 * 
 * Priorisierung:
 * 1. SANDBOX: Nutzt globale Sandbox Credentials (für Testing)
 * 2. PRODUCTION mit Store Credentials: Store eigene clientId/clientSecret
 * 3. PRODUCTION mit Platform Credentials: markt.ma zentrale clientId/clientSecret
 * 4. PRODUCTION ohne Credentials: blockieren mit klarer Fehlermeldung
 * 
 * Security:
 * - Kein clientSecret/password loggen
 * - Nur maskierte clientId loggen
 * - credentialsSource für Audit-Trail
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlSettingsResolver {
    
    private final StoreDeliverySettingsRepository deliverySettingsRepository;
    private final DhlProperties globalDhlProperties;
    private final SecretEncryptionService encryptionService;
    
    /**
     * Resolved DHL Config für einen Store
     * 
     * Resolver-Regeln:
     * 1. SANDBOX: Nutzt globale Sandbox Credentials
     * 2. PRODUCTION erweitert: Store hat eigene clientId/clientSecret
     * 3. PRODUCTION einfach: Platform Credentials + Store Business-Daten
     * 4. PRODUCTION blockieren: Keine Credentials verfügbar
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
            String environment = storeSettings.getDhlEnvironment();
            
            // SANDBOX Mode
            if ("SANDBOX".equalsIgnoreCase(environment)) {
                if (isStoreConfigComplete(storeSettings)) {
                    log.debug("✅ Store {} using SANDBOX with store-specific config", storeId);
                    return buildStoreConfig(storeSettings);
                } else {
                    log.debug("⚡ Store {} using global SANDBOX config (fallback)", storeId);
                    return buildGlobalSandboxConfig();
                }
            }
            
            // PRODUCTION Mode
            if ("PRODUCTION".equalsIgnoreCase(environment)) {
                // 2. PRODUCTION erweitert: Store hat eigene Client ID/Secret
                if (hasStoreOwnCredentials(storeSettings)) {
                    if (isStoreConfigComplete(storeSettings)) {
                        log.info("✅ Store {} using PRODUCTION with store-specific credentials (erweitert)", 
                            storeId);
                        return buildStoreConfig(storeSettings);
                    } else {
                        log.error("❌ Store {} has partial credentials but config incomplete", storeId);
                        throw new DhlConfigurationException(
                            "Store has partial DHL credentials but configuration is incomplete. " +
                            "Please provide all required fields: clientId, clientSecret, username, password, " +
                            "billingNumber, shipper address.",
                            "shipping.dhl.storeConfigIncomplete"
                        );
                    }
                }
                
                // 3. PRODUCTION einfacher Modus: Platform Credentials
                if (globalDhlProperties.hasPlatformCredentials()) {
                    if (hasStoreBusinessData(storeSettings)) {
                        log.info("✅ Store {} using PRODUCTION with Platform Credentials (einfach)", 
                            storeId);
                        return buildPlatformCredentialsConfig(storeSettings);
                    } else {
                        log.error("❌ Store {} wants Platform Credentials but business data incomplete " +
                            "(username, password, billingNumber, shipper address required)", storeId);
                        throw new DhlConfigurationException(
                            "DHL Platform Credentials are enabled but store business data is incomplete. " +
                            "Please provide: DHL username, password, billing number, and shipper address.",
                            "shipping.dhl.businessDataIncomplete"
                        );
                    }
                }
                
                // 4. PRODUCTION blockieren: Keine Credentials
                log.error("❌ Store {} PRODUCTION: No credentials available. " +
                    "Either configure store credentials or enable Platform Credentials " +
                    "(DHL_PLATFORM_CREDENTIALS_ALLOWED=true). " +
                    "messageKey: shipping.dhl.platformCredentialsMissing", storeId);
                throw new DhlConfigurationException(
                    "DHL Production shipping is not yet activated for this store. " +
                    "Platform Credentials are not configured. " +
                    "Please contact markt.ma support or configure your own DHL API credentials.",
                    "shipping.dhl.platformCredentialsMissing"
                );
            }
        }
        
        // Fallback: Globale ENV Settings (NUR für Sandbox!)
        if (globalDhlProperties.isEnabled() && globalDhlProperties.isSandbox()) {
            log.debug("⚡ Store {} using global SANDBOX ENV config (no store settings)", storeId);
            return buildGlobalSandboxConfig();
        }
        
        // DHL nicht verfügbar
        log.debug("❌ DHL not configured for store {}", storeId);
        throw new DhlConfigurationException(
            "DHL integration is not enabled for this store. " +
            "Please enable DHL in Store Shipping Settings.",
            "shipping.dhl.notEnabled"
        );
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
    
    /**
     * Prüft ob Store eigene Client ID/Secret hat (PRODUCTION erweitert)
     */
    private boolean hasStoreOwnCredentials(StoreDeliverySettings settings) {
        return !isBlank(settings.getDhlClientId()) && !isBlank(settings.getDhlClientSecret());
    }
    
    /**
     * Prüft ob Store Business-Daten für Platform Credentials hat
     */
    private boolean hasStoreBusinessData(StoreDeliverySettings settings) {
        // Username/Password/BillingNumber erforderlich
        if (isBlank(settings.getDhlUsername()) || 
            isBlank(settings.getDhlPassword()) || 
            isBlank(settings.getDhlBillingNumber())) {
            return false;
        }
        
        // Shipper Adresse erforderlich
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
        config.setCredentialsSource("STORE");
        config.setEnvironment(settings.getDhlEnvironment());
        config.setClientId(settings.getDhlClientId());
        config.setClientSecret(decryptSecret(settings.getDhlClientSecret(), "dhlClientSecret"));
        config.setUsername(settings.getDhlUsername());
        config.setPassword(decryptSecret(settings.getDhlPassword(), "dhlPassword"));
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
     * Baut Platform Credentials Config (PRODUCTION einfacher Modus)
     * Nutzt markt.ma zentrale Client ID/Secret + Store Business-Daten
     */
    private ResolvedDhlConfig buildPlatformCredentialsConfig(StoreDeliverySettings settings) {
        ResolvedDhlConfig config = new ResolvedDhlConfig();
        config.setCredentialsSource("PLATFORM");
        config.setEnvironment("PRODUCTION");
        
        // Platform Credentials (markt.ma zentral)
        config.setClientId(globalDhlProperties.getPlatformClientId());
        config.setClientSecret(globalDhlProperties.getPlatformClientSecret());
        
        // Store Business-Daten (Händler-spezifisch)
        config.setUsername(settings.getDhlUsername());
        config.setPassword(decryptSecret(settings.getDhlPassword(), "dhlPassword"));
        config.setBillingNumber(settings.getDhlBillingNumber());
        
        // Shipper Address (Store)
        config.setShipperName(settings.getDhlShipperName());
        config.setShipperStreet(settings.getDhlShipperStreet());
        config.setShipperHouseNumber(settings.getDhlShipperHouseNumber());
        config.setShipperPostalCode(settings.getDhlShipperPostalCode());
        config.setShipperCity(settings.getDhlShipperCity());
        config.setShipperCountry(settings.getDhlShipperCountry());
        config.setShipperEmail(settings.getDhlShipperEmail());
        config.setShipperPhone(settings.getDhlShipperPhone());
        
        // Package Defaults
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
     * Baut globale Sandbox Config
     */
    private ResolvedDhlConfig buildGlobalSandboxConfig() {
        ResolvedDhlConfig config = new ResolvedDhlConfig();
        config.setCredentialsSource("SANDBOX");
        config.setEnvironment("SANDBOX");
        config.setClientId(globalDhlProperties.getClientId());
        config.setClientSecret(globalDhlProperties.getClientSecret());
        
        // Sandbox Credentials
        config.setUsername(globalDhlProperties.getSandboxUsername());
        config.setPassword(globalDhlProperties.getSandboxPassword());
        
        // Sandbox Shipper Address
        config.setShipperName(globalDhlProperties.getSandboxShipperName());
        config.setShipperStreet(globalDhlProperties.getSandboxShipperStreet());
        config.setShipperHouseNumber(globalDhlProperties.getSandboxShipperHouseNumber());
        config.setShipperPostalCode(globalDhlProperties.getSandboxShipperPostalCode());
        config.setShipperCity(globalDhlProperties.getSandboxShipperCity());
        config.setShipperCountry(globalDhlProperties.getSandboxShipperCountry());
        
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
     * 
     * Enthält alle resolved Credentials + Settings für DHL API Calls.
     * 
     * WICHTIG Security:
     * - clientSecret / password NIEMALS loggen!
     * - Nutze getMaskedClientId() für Logs
     * - Nutze getLoggingInfo() für sichere Audit-Logs
     */
    public static class ResolvedDhlConfig {
        private String credentialsSource; // "SANDBOX" | "STORE" | "PLATFORM"
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

        // ════════════════════════════════════════════════════════════
        // Getters & Setters
        // ════════════════════════════════════════════════════════════
        
        public String getCredentialsSource() { return credentialsSource; }
        public void setCredentialsSource(String credentialsSource) { this.credentialsSource = credentialsSource; }
        
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
        
        public boolean isPlatformCredentials() {
            return "PLATFORM".equalsIgnoreCase(credentialsSource);
        }
        
        /**
         * Maskierte Client ID für Logging (erste 4 Zeichen + ****)
         * SECURITY: Niemals volle Client ID loggen!
         */
        public String getMaskedClientId() {
            if (clientId == null || clientId.length() <= 4) {
                return "****";
            }
            return clientId.substring(0, 4) + "****";
        }
        
        /**
         * Sichere Logging-Info (keine Secrets!)
         * Für Audit-Trail und Debugging.
         */
        public String getLoggingInfo() {
            return String.format(
                "environment=%s, credentialsSource=%s, clientId=%s, usernameConfigured=%s, passwordConfigured=%s",
                environment,
                credentialsSource,
                getMaskedClientId(),
                username != null && !username.isEmpty(),
                password != null && !password.isEmpty()
            );
        }
        
        /**
         * Auth URL basierend auf Environment
         */
        public String getAuthUrl() {
            if (isSandbox()) {
                return "https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token";
            } else {
                return "https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token";
            }
        }
        
        /**
         * Shipping API Base URL basierend auf Environment
         */
        public String getShippingBaseUrl() {
            if (isSandbox()) {
                return "https://api-sandbox.dhl.com/parcel/de/shipping/v2";
            } else {
                return "https://api-eu.dhl.com/parcel/de/shipping/v2";
            }
        }
    }
    
    /**
     * Entschlüsselt ein Secret aus DB
     * 
     * Migration-freundlich:
     * - Wenn Wert mit "ENC(" startet → entschlüsseln
     * - Sonst → als Klartext durchreichen (alter Wert)
     * 
     * WICHTIG: Entschlüsselter Wert darf NIEMALS geloggt werden!
     * 
     * @param encryptedValue Verschlüsselter oder Klartext-Wert aus DB
     * @param fieldName Feldname für Logging (nur für Fehlerfall)
     * @return Entschlüsselter Klartext oder null
     */
    private String decryptSecret(String encryptedValue, String fieldName) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            return encryptedValue;
        }
        
        try {
            // decrypt() ist migration-freundlich:
            // - ENC(...) → entschlüsseln
            // - Klartext → durchreichen
            String decrypted = encryptionService.decrypt(encryptedValue);
            
            // NIEMALS entschlüsselten Wert loggen!
            log.debug("Decrypted {} successfully (encrypted: {})", 
                fieldName, 
                encryptionService.isEncrypted(encryptedValue)
            );
            
            return decrypted;
            
        } catch (Exception e) {
            log.error("❌ Failed to decrypt {}: {}", fieldName, e.getMessage());
            throw new DhlConfigurationException(
                "Failed to decrypt " + fieldName + ". " +
                "The encryption key may be wrong or the data may be corrupted.",
                "shipping.dhl.decryptionFailed"
            );
        }
    }
}
