package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.PhoneVerification;
import storebackend.repository.PhoneVerificationRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service für Telefonnummer-Verifizierung
 * Unterstützt SMS und WhatsApp mit Fallback-Mechanismus
 *
 * Best Practices:
 * - Rate Limiting pro Nummer
 * - Code-Ablauf nach 10 Minuten
 * - Max 3 Versuche pro Code
 * - Automatische Cleanup alter Codes
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneVerificationService {

    private final PhoneVerificationRepository verificationRepository;
    private final TwilioService twilioService;

    @Value("${verification.code.expiry-minutes:10}")
    private int codeExpiryMinutes;

    @Value("${verification.max-attempts:3}")
    private int maxAttempts;

    @Value("${verification.rate-limit-minutes:1}")
    private int rateLimitMinutes;

    private static final SecureRandom random = new SecureRandom();

    /**
     * Generiert und sendet einen Verifizierungscode
     * Versucht zuerst WhatsApp, dann SMS als Fallback
     *
     * @param phoneNumber Telefonnummer im E.164 Format (z.B. +491234567890)
     * @param storeId Store ID für Tracking
     * @return true wenn erfolgreich gesendet
     */
    @Transactional
    public PhoneVerificationResult sendVerificationCode(String phoneNumber, Long storeId) {
        // Validiere Telefonnummer
        if (!isValidPhoneNumber(phoneNumber)) {
            log.warn("❌ Invalid phone number format: {}", phoneNumber);
            return PhoneVerificationResult.error("Ungültige Telefonnummer. Bitte verwenden Sie das Format +491234567890");
        }

        // Rate Limiting prüfen
        Optional<PhoneVerification> recent = verificationRepository
            .findMostRecentByPhoneNumber(phoneNumber);

        if (recent.isPresent() &&
            recent.get().getCreatedAt().plusMinutes(rateLimitMinutes).isAfter(LocalDateTime.now())) {
            long secondsLeft = java.time.Duration.between(
                LocalDateTime.now(),
                recent.get().getCreatedAt().plusMinutes(rateLimitMinutes)
            ).getSeconds();

            log.warn("⏱️ Rate limit exceeded for {}", phoneNumber);
            return PhoneVerificationResult.error(
                String.format("Bitte warten Sie noch %d Sekunden, bevor Sie einen neuen Code anfordern.", secondsLeft)
            );
        }

        // Generiere 6-stelligen Code
        String code = generateVerificationCode();

        // Speichere in Datenbank
        PhoneVerification verification = new PhoneVerification();
        verification.setPhoneNumber(phoneNumber);
        verification.setCode(code);
        verification.setStoreId(storeId);
        verification.setVerified(false);
        verification.setAttempts(0);
        verification.setCreatedAt(LocalDateTime.now());
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(codeExpiryMinutes));
        verification = verificationRepository.save(verification);

        log.info("🔐 Generated verification code for {} (ID: {})", phoneNumber, verification.getId());

        // Versuche WhatsApp zuerst, dann SMS als Fallback
        boolean sent = false;
        String channel = "unknown";

        try {
            // WhatsApp Versuch
            if (twilioService.sendWhatsAppMessage(phoneNumber,
                String.format("Ihr Verifizierungscode lautet: %s\n\nGültig für %d Minuten.", code, codeExpiryMinutes))) {
                sent = true;
                channel = "whatsapp";
                verification.setChannel("whatsapp");
                log.info("✅ WhatsApp message sent to {}", phoneNumber);
            }
        } catch (Exception e) {
            log.warn("⚠️ WhatsApp failed, trying SMS fallback: {}", e.getMessage());
        }

        if (!sent) {
            try {
                // SMS Fallback
                if (twilioService.sendSMS(phoneNumber,
                    String.format("Ihr Verifizierungscode: %s (gültig %d Min.)", code, codeExpiryMinutes))) {
                    sent = true;
                    channel = "sms";
                    verification.setChannel("sms");
                    log.info("✅ SMS sent to {}", phoneNumber);
                }
            } catch (Exception e) {
                log.error("❌ SMS also failed: {}", e.getMessage());
            }
        }

        verificationRepository.save(verification);

        if (!sent) {
            return PhoneVerificationResult.error("Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.");
        }

        return PhoneVerificationResult.success(
            verification.getId(),
            channel,
            String.format("Code per %s gesendet. Gültig für %d Minuten.",
                channel.equals("whatsapp") ? "WhatsApp" : "SMS",
                codeExpiryMinutes)
        );
    }

    /**
     * Verifiziert einen eingegebenen Code
     *
     * @param verificationId ID der Verifizierung
     * @param code Eingegebener Code
     * @return true wenn Code korrekt
     */
    @Transactional
    public PhoneVerificationResult verifyCode(Long verificationId, String code) {
        PhoneVerification verification = verificationRepository.findById(verificationId)
            .orElse(null);

        if (verification == null) {
            log.warn("❌ Verification not found: {}", verificationId);
            return PhoneVerificationResult.error("Verifizierung nicht gefunden");
        }

        // Prüfe ob bereits verifiziert
        if (verification.isVerified()) {
            log.info("✅ Already verified: {}", verificationId);
            return PhoneVerificationResult.success(verificationId, verification.getChannel(), "Bereits verifiziert");
        }

        // Prüfe ob abgelaufen
        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("⏱️ Code expired: {}", verificationId);
            return PhoneVerificationResult.error("Code ist abgelaufen. Bitte fordern Sie einen neuen an.");
        }

        // Prüfe Anzahl Versuche
        if (verification.getAttempts() >= maxAttempts) {
            log.warn("🚫 Max attempts reached: {}", verificationId);
            return PhoneVerificationResult.error(
                String.format("Maximale Anzahl Versuche (%d) überschritten. Bitte fordern Sie einen neuen Code an.", maxAttempts)
            );
        }

        // Erhöhe Versuchszähler
        verification.setAttempts(verification.getAttempts() + 1);

        // Prüfe Code
        if (!verification.getCode().equals(code.trim())) {
            verificationRepository.save(verification);
            int remainingAttempts = maxAttempts - verification.getAttempts();
            log.warn("❌ Wrong code for {}: {} attempts left", verificationId, remainingAttempts);

            if (remainingAttempts > 0) {
                return PhoneVerificationResult.error(
                    String.format("Falscher Code. Noch %d Versuch%s übrig.",
                        remainingAttempts,
                        remainingAttempts == 1 ? "" : "e")
                );
            } else {
                return PhoneVerificationResult.error("Falscher Code. Maximale Anzahl Versuche erreicht.");
            }
        }

        // Code ist korrekt!
        verification.setVerified(true);
        verification.setVerifiedAt(LocalDateTime.now());
        verificationRepository.save(verification);

        log.info("✅ Phone number verified successfully: {}", verification.getPhoneNumber());
        return PhoneVerificationResult.success(verificationId, verification.getChannel(), "Telefonnummer erfolgreich verifiziert");
    }

    /**
     * Prüft ob eine Telefonnummer bereits verifiziert ist (innerhalb der letzten 24h)
     */
    @Transactional(readOnly = true)
    public boolean isPhoneVerified(String phoneNumber) {
        LocalDateTime yesterday = LocalDateTime.now().minusHours(24);
        Optional<PhoneVerification> recent = verificationRepository
            .findRecentVerifiedByPhoneNumber(phoneNumber, yesterday);
        return recent.isPresent();
    }

    /**
     * Bereinigt alte Verifizierungen (älter als 24h)
     */
    @Transactional
    public void cleanupOldVerifications() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        int deleted = verificationRepository.deleteByCreatedAtBefore(cutoff);
        if (deleted > 0) {
            log.info("🧹 Cleaned up {} old verifications", deleted);
        }
    }

    // Helper Methods

    private String generateVerificationCode() {
        // 6-stelliger numerischer Code
        return String.format("%06d", random.nextInt(1000000));
    }

    private boolean isValidPhoneNumber(String phoneNumber) {
        // Einfache Validierung für E.164 Format
        // Format: +[country code][number]
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return false;
        }

        // Muss mit + beginnen
        if (!phoneNumber.startsWith("+")) {
            return false;
        }

        // Muss zwischen 8 und 15 Zeichen lang sein (inkl. +)
        if (phoneNumber.length() < 8 || phoneNumber.length() > 16) {
            return false;
        }

        // Nur Ziffern nach dem +
        String digits = phoneNumber.substring(1);
        return digits.matches("\\d+");
    }

    // Result Class
    public static class PhoneVerificationResult {
        private final boolean success;
        private final Long verificationId;
        private final String channel;
        private final String message;

        private PhoneVerificationResult(boolean success, Long verificationId, String channel, String message) {
            this.success = success;
            this.verificationId = verificationId;
            this.channel = channel;
            this.message = message;
        }

        public static PhoneVerificationResult success(Long verificationId, String channel, String message) {
            return new PhoneVerificationResult(true, verificationId, channel, message);
        }

        public static PhoneVerificationResult error(String message) {
            return new PhoneVerificationResult(false, null, null, message);
        }

        public boolean isSuccess() { return success; }
        public Long getVerificationId() { return verificationId; }
        public String getChannel() { return channel; }
        public String getMessage() { return message; }
    }
}

