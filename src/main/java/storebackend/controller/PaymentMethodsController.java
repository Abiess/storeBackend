package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.PaymentMethodsResponse;
import storebackend.payment.paypal.PayPalConfig;

@RestController
@RequestMapping("/api/public/stores/{storeId}")
@RequiredArgsConstructor
@Slf4j
public class PaymentMethodsController {
    
    private final PayPalConfig paypalConfig;
    
    @GetMapping("/payment-methods")
    public ResponseEntity<PaymentMethodsResponse> getPaymentMethods(@PathVariable Long storeId) {
        // Phase 1A: Globale PayPal-Konfiguration für alle Stores
        // Phase 1B: Store-spezifische Konfiguration aus StorePaymentConfiguration laden
        
        boolean paypalConfigured = paypalConfig.isConfigured();
        String mode = paypalConfigured ? paypalConfig.getMode() : "SANDBOX";
        
        PaymentMethodsResponse.PayPalConfig paypal = PaymentMethodsResponse.PayPalConfig.builder()
            .enabled(true)  // Phase 1A: PayPal ist aktiviert, wenn konfiguriert
            .configured(paypalConfigured)
            .mode(mode)
            .build();
        
        PaymentMethodsResponse response = PaymentMethodsResponse.builder()
            .paypal(paypal)
            .build();
        
        log.debug("Payment methods for store {}: PayPal configured={}, mode={}", 
            storeId, paypalConfigured, mode);
        
        return ResponseEntity.ok(response);
    }
}
