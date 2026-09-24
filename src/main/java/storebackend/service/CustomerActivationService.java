package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.controller.StoreCustomerActivationController;
import storebackend.dto.EmailDeliveryResult;
import storebackend.dto.EmailOperationResponse;
import storebackend.entity.User;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Service für Kundenaktivierung nach WooCommerce-Import.
 * Versendet Passwort-setzen-Links an importierte Kunden.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerActivationService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final PasswordResetService passwordResetService;
    
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    
    public CustomerProfileRepository getCustomerProfileRepository() {
        return customerProfileRepository;
    }

    /**
     * Sendet Aktivierungsmail an einen Kunden.
     * Erstellt Token, versendet Mail, aktualisiert activationEmailSentAt.
     * 
     * Für Store-Admin-Endpoint: gibt echten Versandstatus zurück (nicht neutral)
     * 
     * @param userId User-ID
     * @param storeId Store-ID (für Context/Logging)
     * @return CustomerActivationResponse mit Versandstatus und Timestamp
     */
    @Transactional
    public StoreCustomerActivationController.CustomerActivationResponse sendActivationEmailWithResponse(Long userId, Long storeId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Only send to unverified users
        if (user.getEmailVerified()) {
            log.info("User {} already verified, skipping activation email", userId);
            return new StoreCustomerActivationController.CustomerActivationResponse(
                    true,    // operationSuccessful
                    false,   // emailSent
                    "SKIPPED",
                    null,
                    "User already verified",
                    false,
                    null
            );
        }

        try {
            // Use existing PasswordResetService (generates token + sends email)
            EmailDeliveryResult result = passwordResetService.initiatePasswordReset(
                    user.getEmail(),
                    user.getPreferredLanguage()
            );
            
            // Update activation timestamp
            LocalDateTime now = LocalDateTime.now();
            user.setActivationEmailSentAt(now);
            userRepository.save(user);

            log.info("Activation email {} for user {} (storeId {})", 
                    result.isSent() ? "sent" : "failed", userId, storeId);

            // Build response
            return new StoreCustomerActivationController.CustomerActivationResponse(
                    true,  // operationSuccessful
                    result.isSent(),
                    result.status().name(),
                    result.errorCode(),
                    result.isSent() ? "Activation email sent" : result.userMessage(),
                    !result.isPermanentFailure(),
                    result.isSent() ? now.format(ISO_FORMATTER) : null
            );

        } catch (Exception e) {
            log.error("Failed to send activation email for user {} (storeId {}): {}", 
                    userId, storeId, e.getMessage());

            return new StoreCustomerActivationController.CustomerActivationResponse(
                    false,   // operationSuccessful
                    false,   // emailSent
                    "FAILED",
                    null,
                    "Internal error: " + e.getMessage(),
                    false,
                    null
            );
        }
    }
    
    /**
     * Legacy method for backwards compatibility (returns EmailOperationResponse).
     * New code should use sendActivationEmailWithResponse().
     */
    @Transactional
    public EmailOperationResponse sendActivationEmail(Long userId, Long storeId) {
        StoreCustomerActivationController.CustomerActivationResponse response = sendActivationEmailWithResponse(userId, storeId);
        
        return new EmailOperationResponse(
                response.operationSuccessful(),
                response.emailSent(),
                response.emailStatus(),
                response.emailErrorCode(),
                response.message(),
                response.retryAllowed()
        );
    }

    /**
     * Sendet Aktivierungsmails an mehrere Kunden (max 25).
     * Stoppt NICHT bei Fehlern, sondern versucht alle.
     * 
     * @param userIds Liste von User-IDs
     * @param storeId Store-ID
     * @return Zusammenfassung
     */
    @Transactional
    public StoreCustomerActivationController.BulkActivationResponse sendBulkActivationEmails(List<Long> userIds, Long storeId) {
        int sent = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (Long userId : userIds) {
            try {
                StoreCustomerActivationController.CustomerActivationResponse response = sendActivationEmailWithResponse(userId, storeId);

                if (response.emailSent()) {
                    sent++;
                } else {
                    failed++;
                    errors.add(String.format("User %d: %s", userId, response.message()));
                }
            } catch (Exception e) {
                failed++;
                errors.add(String.format("User %d: %s", userId, e.getMessage()));
                log.error("Bulk activation failed for user {}: {}", userId, e.getMessage());
            }
        }

        log.info("Bulk activation for store {}: {} sent, {} failed", storeId, sent, failed);

        return new StoreCustomerActivationController.BulkActivationResponse(sent, failed, errors);
    }
}
