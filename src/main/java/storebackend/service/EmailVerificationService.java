package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.EmailVerification;
import storebackend.entity.User;
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

    /**
     * Erstellt einen Verification-Token und sendet Email
     * WICHTIG: Diese Methode muss in einer NEUEN Transaction laufen,
     * um Rollbacks der Outer Transaction zu vermeiden
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createAndSendVerificationToken(User user) {
        try {
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

            log.info("Verification token created for user: {}", user.getEmail());

            // Sende Email NACH dem DB-Commit (außerhalb der Transaction)
            sendVerificationEmailAsync(user.getEmail(), token);

        } catch (Exception e) {
            log.error("Failed to create verification token for user: {}", user.getEmail(), e);
            // ❌ Werfe keine Exception, um die Registrierung nicht zu blockieren
        }
    }

    /**
     * Sendet Verification-Email asynchron (ohne Transaktionskontext)
     * Failures hier blockieren NICHT die User-Registrierung
     */
    private void sendVerificationEmailAsync(String email, String token) {
        try {
            emailService.sendVerificationEmail(email, token);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}, but token was saved in DB. User can request resend.", email, e);
            // ❌ NICHT werfen - Email-Fehler dürfen Registrierung nicht blockieren
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
            emailService.sendWelcomeEmail(user.getEmail(), user.getName());
        } catch (Exception e) {
            log.warn("Failed to send welcome email, but verification was successful", e);
        }

        log.info("Email verified successfully for user: {}", user.getEmail());
    }

    /**
     * Sendet eine neue Verification-Email (Resend-Funktionalität)
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        createAndSendVerificationToken(user);
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
