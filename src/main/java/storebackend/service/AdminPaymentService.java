package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.PaymentSettingsDTO;
import storebackend.dto.PaymentSettingsUpdateRequest;
import storebackend.entity.Store;
import storebackend.entity.StorePaymentConfiguration;
import storebackend.enums.ConnectionStatus;
import storebackend.enums.PaymentMode;
import storebackend.enums.PaymentProvider;
import storebackend.payment.paypal.PayPalConfig;
import storebackend.repository.StorePaymentConfigurationRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminPaymentService {
    
    private final StorePaymentConfigurationRepository paymentConfigRepo;
    private final StoreRepository storeRepo;
    private final PayPalConfig paypalConfig;
    
    /**
     * Lade alle Payment-Konfigurationen für einen Store
     */
    public List<PaymentSettingsDTO> getPaymentSettings(Long storeId) {
        List<StorePaymentConfiguration> configs = paymentConfigRepo.findByStoreId(storeId);
        
        // Wenn keine PayPal-Config existiert, Default erstellen
        if (configs.stream().noneMatch(c -> c.getProvider() == PaymentProvider.PAYPAL)) {
            StorePaymentConfiguration defaultConfig = createDefaultPayPalConfig(storeId);
            configs.add(defaultConfig);
        }
        
        return configs.stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Lade PayPal-Konfiguration für einen Store
     */
    public PaymentSettingsDTO getPayPalSettings(Long storeId) {
        StorePaymentConfiguration config = paymentConfigRepo
            .findByStoreIdAndProvider(storeId, PaymentProvider.PAYPAL)
            .orElseGet(() -> createDefaultPayPalConfig(storeId));
        
        return toDTO(config);
    }
    
    /**
     * Aktiviere/Deaktiviere PayPal für einen Store
     */
    @Transactional
    public PaymentSettingsDTO updatePayPalSettings(Long storeId, PaymentSettingsUpdateRequest request) {
        Store store = storeRepo.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        StorePaymentConfiguration config = paymentConfigRepo
            .findByStoreAndProvider(store, request.getProvider())
            .orElseGet(() -> {
                // Neue Config erstellen
                StorePaymentConfiguration newConfig = new StorePaymentConfiguration();
                newConfig.setStore(store);
                newConfig.setProvider(request.getProvider());
                newConfig.setMode(PaymentMode.SANDBOX);
                newConfig.setConnectionStatus(ConnectionStatus.PLATFORM_SANDBOX);
                newConfig.setOnboardingCompleted(false);
                newConfig.setPermissionsGranted(false);
                newConfig.setEmailConfirmed(false);
                return newConfig;
            });
        
        if (request.getEnabled() != null) {
            config.setEnabled(request.getEnabled());
        }
        
        config = paymentConfigRepo.save(config);
        
        log.info("Payment settings updated: storeId={}, provider={}, enabled={}", 
            storeId, request.getProvider(), config.isEnabled());
        
        return toDTO(config);
    }
    
    /**
     * Prüfe Verbindungsstatus (z.B. ob globale Credentials vorhanden)
     */
    @Transactional
    public PaymentSettingsDTO checkConnection(Long storeId, PaymentProvider provider) {
        StorePaymentConfiguration config = paymentConfigRepo
            .findByStoreIdAndProvider(storeId, provider)
            .orElseThrow(() -> new IllegalArgumentException("Payment configuration not found"));
        
        // Prüfe globale PayPal-Konfiguration
        boolean globalConfigured = false;
        if (provider == PaymentProvider.PAYPAL) {
            globalConfigured = paypalConfig.isConfigured();
        }
        
        // Update Status
        if (globalConfigured) {
            if (config.getConnectionStatus() == ConnectionStatus.NOT_CONNECTED) {
                config.setConnectionStatus(ConnectionStatus.PLATFORM_SANDBOX);
            }
        } else {
            config.setConnectionStatus(ConnectionStatus.ERROR);
        }
        
        config.setLastCheckedAt(LocalDateTime.now());
        config = paymentConfigRepo.save(config);
        
        log.info("Connection check: storeId={}, provider={}, status={}", 
            storeId, provider, config.getConnectionStatus());
        
        return toDTO(config);
    }
    
    // ================================================================================
    // Hilfsmethoden
    // ================================================================================
    
    private StorePaymentConfiguration createDefaultPayPalConfig(Long storeId) {
        boolean globalConfigured = paypalConfig.isConfigured();
        
        Store store = storeRepo.findById(storeId).orElse(null);
        
        StorePaymentConfiguration config = new StorePaymentConfiguration();
        config.setStore(store);
        config.setProvider(PaymentProvider.PAYPAL);
        config.setEnabled(false); // Default: deaktiviert
        config.setMode(PaymentMode.SANDBOX);
        config.setConnectionStatus(globalConfigured 
            ? ConnectionStatus.PLATFORM_SANDBOX 
            : ConnectionStatus.NOT_CONNECTED);
        config.setOnboardingCompleted(false);
        config.setPermissionsGranted(false);
        config.setEmailConfirmed(false);
        
        return config; // NICHT speichern, nur als Default zurückgeben
    }
    
    private PaymentSettingsDTO toDTO(StorePaymentConfiguration config) {
        return PaymentSettingsDTO.builder()
            .id(config.getId())
            .provider(config.getProvider())
            .enabled(config.isEnabled())
            .mode(config.getMode())
            .connectionStatus(config.getConnectionStatus())
            .merchantAccountId(config.getMerchantAccountId())
            .onboardingCompleted(config.isOnboardingCompleted())
            .permissionsGranted(config.isPermissionsGranted())
            .emailConfirmed(config.isEmailConfirmed())
            .lastCheckedAt(config.getLastCheckedAt())
            .createdAt(config.getCreatedAt())
            .updatedAt(config.getUpdatedAt())
            .displayMode(config.getMode() != null ? config.getMode().name() : "SANDBOX")
            .displayStatus(config.getConnectionStatus() != null 
                ? config.getConnectionStatus().name() 
                : "NOT_CONNECTED")
            .build();
    }
}
