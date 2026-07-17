package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.EmailDeliveryResult;
import storebackend.entity.EmailVerification;
import storebackend.entity.User;
import storebackend.exception.RateLimitExceededException;
import storebackend.repository.EmailVerificationRepository;
import storebackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    private static final int RESEND_COOLDOWN_MINUTES = 2; // Cooldown zwischen Resend-Requests

    /**
     * Erstellt einen Verification-Token und sendet Email
     * WICHTIG: Läuft in derselben Transaction wie User-Registrierung (REQUIRED)
     * damit der Foreign Key constraint erfüllt ist
     * 
     * @return EmailDeliveryResult mit Status des E-Mail-Versands
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public EmailDeliveryResult createAndSendVerificationToken(User user) {
        // Lösche alte Tokens für diesen User
        emailVerificationRepository.findByUser(user)
            .ifPresent(emailVerificationRepository::delete);

        // Erstelle neuen Token (UUID für Sicherheit)
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

        EmailVerification verification = new EmailVerification();
        verification.setUser(user);
        verification.setToken(token);
        verification.setExpiresAt(expiresAt);

        emailVerificationRepository.save(verification);

        log.info("✅ Verification token created for user: {}", user.getEmail());

        // Sende Email und return result
        return sendVerificationEmailWithResult(user.getEmail(), token, user.getPreferredLanguage());
    }

    /**
     * Sendet Verification-Email und gibt Result zurück
     * Failures hier blockieren NICHT die User-Registrierung
     * 
     * @return EmailDeliveryResult mit Status, ErrorCode und User-Message
     */
    private EmailDeliveryResult sendVerificationEmailWithResult(String email, String token, String lang) {
        try {
            return emailService.sendVerificationEmailWithResult(email, token, lang != null ? lang : "en");
        } catch (Exception e) {
            log.error("❌ Failed to send verification email to: {}, but token was saved in DB. User can request resend.", email, e);
            return EmailDeliveryResult.temporaryFailure(
                "UNKNOWN_EMAIL_ERROR",
                "Die Bestätigungs-E-Mail konnte derzeit nicht versendet werden. Sie können sie erneut anfordern."
            );
        }
    }

    /**
     * Verifiziert einen Token und aktiviert den User
     */
    @Transactional
    public void verifyToken(String token) {
        EmailVerification verification = emailVerificationRepository.findByToken(token)
            .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (verification.isExpired()) {
            emailVerificationRepository.delete(verification);
            throw new RuntimeException("Verification token has expired");
        }

        User user = verification.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        // Lösche Token nach erfolgreicher Verification
        emailVerificationRepository.delete(verification);

        // Sende Welcome Email (optional)
        try {
            emailService.sendWelcomeEmail(user.getEmail(), user.getName(), user.getPreferredLanguage());
        } catch (Exception e) {
            log.warn("Failed to send welcome email, but verification was successful", e);
        }

        log.info("Email verified successfully for user: {}", user.getEmail());
    }

    /**
     * Sendet eine neue Verification-Email (Resend-Funktionalität)
     * MIT COOLDOWN-SCHUTZ gegen Spam
     * 
     * SECURITY: Neutrale Antwort - verrät nicht ob Email existiert (User-Enumeration-Schutz)
     * ABER: Gibt intern den echten E-Mail-Versandstatus zurück für korrektes UI-Feedback
     * 
     * @return EmailDeliveryResult mit echtem Versandstatus (nur wenn User existiert)
     */
    @Transactional
    public EmailDeliveryResult resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElse(null);

        // SECURITY: Neutrale Antwort - keine Information ob User existiert
        if (user == null) {
            log.debug("Resend verification requested for unknown email: {}", email);
            // Gebe "erfolgreichen" Fake-Result zurück (Security: User-Enumeration-Schutz)
            return EmailDeliveryResult.success();
        }
        
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            log.debug("Resend verification requested for already verified email: {}", email);
            // Auch hier neutral: Fake-Success zurückgeben
            return EmailDeliveryResult.success();
        }

        // Prüfe Cooldown: Wann wurde der letzte Token erstellt?
        EmailVerification existingVerification = emailVerificationRepository.findByUser(user)
            .orElse(null);

        if (existingVerification != null) {
            LocalDateTime lastSent = existingVerification.getCreatedAt();
            LocalDateTime cooldownEnd = lastSent.plusMinutes(RESEND_COOLDOWN_MINUTES);

            if (LocalDateTime.now().isBefore(cooldownEnd)) {
                long secondsRemaining = java.time.Duration.between(LocalDateTime.now(), cooldownEnd).getSeconds();
                throw new RateLimitExceededException(
                    String.format("Please wait %d seconds before requesting another verification email", secondsRemaining)
                );
            }
        }

        // Erstelle Token und sende Mail - gibt echten EmailDeliveryResult zurück
        return createAndSendVerificationToken(user);
    }

    /**
     * Cleanup abgelaufener Tokens (kann per Scheduled Task aufgerufen werden)
     */
    @Transactional
    public void cleanupExpiredTokens() {
        emailVerificationRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        log.info("Expired verification tokens cleaned up");
    }
}

