package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.EmailOperationResponse;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.service.CustomerActivationService;

import java.util.List;
import java.util.Optional;

/**
 * Store-Admin Endpoint für Kundenaktivierung.
 * Ermöglicht Store-Ownern, Aktivierungsmails an importierte Kunden zu senden.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/customers/activation")
@RequiredArgsConstructor
@Slf4j
public class StoreCustomerActivationController {

    private final CustomerActivationService activationService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    /**
     * Sendet Aktivierungs-/Passwort-setzen-Mail an einen einzelnen Kunden.
     * 
     * Sicherheit:
     * - Store Owner oder STORE_ADMIN erforderlich
     * - User muss über CustomerProfile dem Store zugeordnet sein
     * 
     * @param storeId Store-ID
     * @param userId User-ID des Kunden
     * @param principal Eingeloggter Store-Owner
     * @return CustomerActivationResponse mit Versandstatus
     */
    @PostMapping("/{userId}")
    public ResponseEntity<CustomerActivationResponse> sendActivationEmail(
            @PathVariable Long storeId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails principal
    ) {
        log.info("Store {} requesting activation email for user {}", storeId, userId);

        // Verify store ownership
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Store not found"));

        User owner = (User) principal;
        if (!store.getOwner().getId().equals(owner.getId())) {
            log.warn("User {} is not owner of store {}", owner.getId(), storeId);
            return ResponseEntity.status(403).body(CustomerActivationResponse.unauthorized());
        }

        // Verify user exists and has CustomerProfile for this store
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Check if user is actually a customer of this store
        Optional<storebackend.entity.CustomerProfile> customerProfile = 
            activationService.getCustomerProfileRepository()
                .findByUserIdAndStoreId(userId, storeId);
                
        if (customerProfile.isEmpty()) {
            log.warn("User {} is not a customer of store {}", userId, storeId);
            return ResponseEntity.status(404).body(CustomerActivationResponse.notFound());
        }

        // Send activation email
        CustomerActivationResponse response = activationService.sendActivationEmailWithResponse(userId, storeId);

        return ResponseEntity.ok(response);
    }

    /**
     * Sendet Aktivierungsmails an mehrere Kunden (max 25).
     * 
     * @param storeId Store-ID
     * @param request Liste von User-IDs
     * @param principal Eingeloggter Store-Owner
     * @return Zusammenfassung: erfolgreich, fehlgeschlagen
     */
    @PostMapping("/bulk")
    public ResponseEntity<BulkActivationResponse> sendBulkActivationEmails(
            @PathVariable Long storeId,
            @RequestBody BulkActivationRequest request,
            @AuthenticationPrincipal UserDetails principal
    ) {
        log.info("Store {} requesting bulk activation emails for {} users", storeId, request.userIds.size());

        // Verify store ownership
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Store not found"));

        User owner = (User) principal;
        if (!store.getOwner().getId().equals(owner.getId())) {
            log.warn("User {} is not owner of store {}", owner.getId(), storeId);
            return ResponseEntity.status(403).build();
        }

        // Limit to 25 customers
        List<Long> userIds = request.userIds.stream().limit(25).toList();

        BulkActivationResponse response = activationService.sendBulkActivationEmails(userIds, storeId);

        return ResponseEntity.ok(response);
    }

    // DTO classes
    public record BulkActivationRequest(List<Long> userIds) {}

    public record BulkActivationResponse(
            int sent,
            int failed,
            List<String> errors
    ) {}
    
    public record CustomerActivationResponse(
            boolean operationSuccessful,
            boolean emailSent,
            String emailStatus,
            String emailErrorCode,
            String message,
            boolean retryAllowed,
            String activationEmailSentAt  // ISO 8601 timestamp
    ) {
        public static CustomerActivationResponse unauthorized() {
            return new CustomerActivationResponse(
                false, false, "UNAUTHORIZED", null, "Not authorized", false, null
            );
        }
        
        public static CustomerActivationResponse notFound() {
            return new CustomerActivationResponse(
                false, false, "NOT_FOUND", null, "User not found or not customer of this store", false, null
            );
        }
    }
}
