package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.PaymentSettingsDTO;
import storebackend.dto.PaymentSettingsUpdateRequest;
import storebackend.enums.PaymentProvider;
import storebackend.service.AdminPaymentService;

import java.util.List;

/**
 * Admin-Controller für Store-Payment-Settings
 * 
 * Nur Store-Admins haben Zugriff.
 * Keine Eingabefelder für Client Secrets - die bleiben serverseitig.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/admin/payment-settings")
@RequiredArgsConstructor
@PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
@Slf4j
public class AdminPaymentSettingsController {
    
    private final AdminPaymentService adminPaymentService;
    
    /**
     * Alle Payment-Konfigurationen für einen Store laden
     */
    @GetMapping
    public ResponseEntity<List<PaymentSettingsDTO>> getPaymentSettings(@PathVariable Long storeId) {
        log.debug("GET payment settings: storeId={}", storeId);
        List<PaymentSettingsDTO> settings = adminPaymentService.getPaymentSettings(storeId);
        return ResponseEntity.ok(settings);
    }
    
    /**
     * PayPal-Konfiguration für einen Store laden
     */
    @GetMapping("/paypal")
    public ResponseEntity<PaymentSettingsDTO> getPayPalSettings(@PathVariable Long storeId) {
        log.debug("GET PayPal settings: storeId={}", storeId);
        PaymentSettingsDTO settings = adminPaymentService.getPayPalSettings(storeId);
        return ResponseEntity.ok(settings);
    }
    
    /**
     * PayPal aktivieren/deaktivieren
     */
    @PutMapping("/paypal")
    public ResponseEntity<PaymentSettingsDTO> updatePayPalSettings(
            @PathVariable Long storeId,
            @RequestBody PaymentSettingsUpdateRequest request) {
        
        log.info("UPDATE PayPal settings: storeId={}, enabled={}", storeId, request.getEnabled());
        
        // Provider setzen (falls nicht im Request)
        if (request.getProvider() == null) {
            request.setProvider(PaymentProvider.PAYPAL);
        }
        
        PaymentSettingsDTO updated = adminPaymentService.updatePayPalSettings(storeId, request);
        return ResponseEntity.ok(updated);
    }
    
    /**
     * Verbindung prüfen (globale Credentials vorhanden?)
     */
    @PostMapping("/paypal/check-connection")
    public ResponseEntity<PaymentSettingsDTO> checkPayPalConnection(@PathVariable Long storeId) {
        log.info("CHECK PayPal connection: storeId={}", storeId);
        PaymentSettingsDTO result = adminPaymentService.checkConnection(storeId, PaymentProvider.PAYPAL);
        return ResponseEntity.ok(result);
    }
}
