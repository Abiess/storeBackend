package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.PaymentSettingsDTO;
import storebackend.dto.PaymentSettingsUpdateRequest;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.PaymentProvider;
import storebackend.repository.StoreRepository;
import storebackend.service.AdminPaymentService;
import storebackend.service.StoreService;

import java.util.List;

/**
 * Admin-Controller für Store-Payment-Settings
 * 
 * Nur Store-Owners haben Zugriff (genau wie Products, Orders, etc.).
 * Keine Eingabefelder für Client Secrets - die bleiben serverseitig.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/admin/payment-settings")
@RequiredArgsConstructor
@Slf4j
public class AdminPaymentSettingsController {
    
    private final AdminPaymentService adminPaymentService;
    private final StoreRepository storeRepository;
    private final StoreService storeService;
    
    /**
     * Prüft, ob der Benutzer Zugriff auf den Store hat
     * (Genau wie ProductController und OrderController)
     */
    private boolean hasStoreAccess(Long storeId, User user) {
        if (user == null) {
            log.warn("[PAYMENT-ACCESS] User is null for storeId={}", storeId);
            return false;
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("[PAYMENT-ACCESS] Store {} not found", storeId);
            return false;
        }

        // Owner hat immer Zugriff
        boolean isOwner = store.getOwner() != null && store.getOwner().getId().equals(user.getId());
        if (isOwner) {
            log.info("[PAYMENT-ACCESS-GRANTED] User {} is owner of store {}", user.getId(), storeId);
            return true;
        }

        // Prüfe, ob der User über StoreService Zugriff hat (z.B. als Mitarbeiter)
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            boolean hasAccess = userStores.stream().anyMatch(s -> s.getId().equals(storeId));
            if (hasAccess) {
                log.info("[PAYMENT-ACCESS-GRANTED] User {} has access via StoreService to store {}", user.getId(), storeId);
            } else {
                log.warn("[PAYMENT-ACCESS-DENIED] User {} is NOT owner and has no access to store {}", user.getId(), storeId);
            }
            return hasAccess;
        } catch (Exception e) {
            log.error("[PAYMENT-ACCESS-ERROR] Error checking store access for user {} and store {}", user.getId(), storeId, e);
            return false;
        }
    }
    
    /**
     * Alle Payment-Konfigurationen für einen Store laden
     */
    @GetMapping
    public ResponseEntity<List<PaymentSettingsDTO>> getPaymentSettings(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        
        if (user == null) {
            log.warn("[PAYMENT-SETTINGS] Unauthorized access attempt to storeId={}", storeId);
            return ResponseEntity.status(401).build();
        }
        
        if (!hasStoreAccess(storeId, user)) {
            log.warn("[PAYMENT-SETTINGS] Access denied: userId={}, storeId={}", user.getId(), storeId);
            return ResponseEntity.status(403).build();
        }
        
        log.debug("GET payment settings: storeId={}, userId={}", storeId, user.getId());
        List<PaymentSettingsDTO> settings = adminPaymentService.getPaymentSettings(storeId);
        return ResponseEntity.ok(settings);
    }
    
    /**
     * PayPal-Konfiguration für einen Store laden
     */
    @GetMapping("/paypal")
    public ResponseEntity<PaymentSettingsDTO> getPayPalSettings(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        
        if (user == null) {
            log.warn("[PAYPAL-SETTINGS] Unauthorized access attempt to storeId={}", storeId);
            return ResponseEntity.status(401).build();
        }
        
        if (!hasStoreAccess(storeId, user)) {
            log.warn("[PAYPAL-SETTINGS] Access denied: userId={}, storeId={}", user.getId(), storeId);
            return ResponseEntity.status(403).build();
        }
        
        log.debug("GET PayPal settings: storeId={}, userId={}", storeId, user.getId());
        PaymentSettingsDTO settings = adminPaymentService.getPayPalSettings(storeId);
        return ResponseEntity.ok(settings);
    }
    
    /**
     * PayPal aktivieren/deaktivieren
     */
    @PutMapping("/paypal")
    public ResponseEntity<PaymentSettingsDTO> updatePayPalSettings(
            @PathVariable Long storeId,
            @RequestBody PaymentSettingsUpdateRequest request,
            @AuthenticationPrincipal User user) {
        
        if (user == null) {
            log.warn("[PAYPAL-UPDATE] Unauthorized access attempt to storeId={}", storeId);
            return ResponseEntity.status(401).build();
        }
        
        if (!hasStoreAccess(storeId, user)) {
            log.warn("[PAYPAL-UPDATE] Access denied: userId={}, storeId={}", user.getId(), storeId);
            return ResponseEntity.status(403).build();
        }
        
        log.info("UPDATE PayPal settings: storeId={}, userId={}, enabled={}", 
            storeId, user.getId(), request.getEnabled());
        
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
    public ResponseEntity<PaymentSettingsDTO> checkPayPalConnection(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        
        if (user == null) {
            log.warn("[PAYPAL-CHECK] Unauthorized access attempt to storeId={}", storeId);
            return ResponseEntity.status(401).build();
        }
        
        if (!hasStoreAccess(storeId, user)) {
            log.warn("[PAYPAL-CHECK] Access denied: userId={}, storeId={}", user.getId(), storeId);
            return ResponseEntity.status(403).build();
        }
        
        log.info("CHECK PayPal connection: storeId={}, userId={}", storeId, user.getId());
        PaymentSettingsDTO result = adminPaymentService.checkConnection(storeId, PaymentProvider.PAYPAL);
        return ResponseEntity.ok(result);
    }
}
