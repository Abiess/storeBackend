package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.PasswordResetToken;
import storebackend.entity.User;
import storebackend.repository.PasswordResetTokenRepository;
import storebackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Erstellt einen Reset-Token und sendet Email
     */
    @Transactional
    public void initiatePasswordReset(String email) {
        // User finden (oder ignorieren wenn nicht existiert - aus Sicherheitsgründen)
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // SECURITY: Gib keine Info, ob Email existiert - verhindert User Enumeration
            log.info("Password reset requested for non-existent email: {}", email);
            // Trotzdem "success" zurückgeben, aber keine Email senden
            return;
        }

        // Lösche alte Tokens für diesen User
        passwordResetTokenRepository.findByUser(user)
            .ifPresent(passwordResetTokenRepository::delete);

        // Erstelle neuen Token (UUID für Sicherheit)
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(1); // 1 Stunde Gültigkeit

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(token);
        resetToken.setExpiresAt(expiresAt);

        passwordResetTokenRepository.save(resetToken);

        // Sende Reset Email
        emailService.sendPasswordResetEmail(user.getEmail(), token);

        log.info("Password reset token created for user: {}", user.getEmail());
    }

    /**
     * Validiert einen Token (ohne ihn zu verwenden)
     */
    @Transactional(readOnly = true)
    public boolean validateToken(String token) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
            .orElse(null);

        if (resetToken == null) {
            return false;
        }

        if (resetToken.isExpired()) {
            return false;
        }

        if (resetToken.isUsed()) {
            return false;
        }

        return true;
    }

    /**
     * Setzt neues Passwort mit Token
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
            .orElseThrow(() -> new RuntimeException("Invalid password reset token"));

        if (resetToken.isExpired()) {
            passwordResetTokenRepository.delete(resetToken);
            throw new RuntimeException("Password reset token has expired");
        }

        if (resetToken.isUsed()) {
            throw new RuntimeException("Password reset token has already been used");
        }

        User user = resetToken.getUser();

        // Setze neues Passwort
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Markiere Token als verwendet
        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        // Sende Bestätigungs-Email
        try {
            emailService.sendPasswordResetConfirmationEmail(user.getEmail(), user.getName());
        } catch (Exception e) {
            log.warn("Failed to send password reset confirmation email, but reset was successful", e);
        }

        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    /**
     * Cleanup abgelaufener und verwendeter Tokens (kann per Scheduled Task aufgerufen werden)
     */
    @Transactional
    public void cleanupExpiredTokens() {
        passwordResetTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        passwordResetTokenRepository.deleteByUsedAtIsNotNull();
        log.info("Expired and used password reset tokens cleaned up");
    }
}

