package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.PaymentMethodsResponse;
import storebackend.entity.StorePaymentConfiguration;
import storebackend.enums.ConnectionStatus;
import storebackend.enums.PaymentProvider;
import storebackend.payment.paypal.PayPalConfig;
import storebackend.repository.StorePaymentConfigurationRepository;

@RestController
@RequestMapping("/api/public/stores/{storeId}")
@RequiredArgsConstructor
@Slf4j
public class PaymentMethodsController {
    
    private final PayPalConfig paypalConfig;
    private final StorePaymentConfigurationRepository storePaymentConfigRepo;
    
    @GetMapping("/payment-methods")
    public ResponseEntity<PaymentMethodsResponse> getPaymentMethods(@PathVariable Long storeId) {
        // Phase 1B: Store-spezifische + globale Konfiguration prüfen
        
        boolean globalConfigured = paypalConfig.isConfigured();
        String mode = paypalConfig.getMode();
        
        // Store-spezifische Config laden
        StorePaymentConfiguration storeConfig = storePaymentConfigRepo
            .findByStoreIdAndProvider(storeId, PaymentProvider.PAYPAL)
            .orElse(null);
        
        boolean storeEnabled = storeConfig != null && storeConfig.isEnabled();
        ConnectionStatus connectionStatus = storeConfig != null 
            ? storeConfig.getConnectionStatus() 
            : ConnectionStatus.NOT_CONNECTED;
        
        // PayPal ist nur verfügbar wenn:
        // - Global konfiguriert UND
        // - Store hat es aktiviert UND
        // - ConnectionStatus erlaubt Zahlungen (PLATFORM_SANDBOX oder CONNECTED)
        boolean paypalAvailable = globalConfigured 
            && storeEnabled 
            && (connectionStatus == ConnectionStatus.PLATFORM_SANDBOX 
                || connectionStatus == ConnectionStatus.CONNECTED);
        
        PaymentMethodsResponse.PayPalConfig paypal = PaymentMethodsResponse.PayPalConfig.builder()
            .enabled(storeEnabled)
            .configured(globalConfigured && paypalAvailable)
            .mode(mode)
            .connectionStatus(connectionStatus.name())
            .build();
        
        PaymentMethodsResponse response = PaymentMethodsResponse.builder()
            .paypal(paypal)
            .build();
        
        log.debug("Payment methods for store {}: PayPal available={}, connectionStatus={}, mode={}", 
            storeId, paypalAvailable, connectionStatus, mode);
        
        return ResponseEntity.ok(response);
    }
}
