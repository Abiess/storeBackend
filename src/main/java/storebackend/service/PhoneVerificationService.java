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
import storebackend.controller.TelegramAuthWebhookController;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneVerificationService {

    private final PhoneVerificationRepository verificationRepository;
    private final WhatsAppService whatsAppService;
    private final TelegramAuthBotService telegramAuthBotService;

    @Value("${verification.code.expiry-minutes:10}")
    private int codeExpiryMinutes;

    @Value("${verification.max-attempts:3}")
    private int maxAttempts;

    @Value("${verification.rate-limit-minutes:1}")
    private int rateLimitMinutes;

    private static final SecureRandom random = new SecureRandom();

    /**
     * Generiert und sendet einen Verifizierungscode.
     * REIHENFOLGE: Erst WhatsApp senden → nur bei Erfolg in DB speichern.
     * So entstehen keine orphaned Einträge mit channel=null, die den Rate-Limiter blockieren.
     */
    @Transactional
    public PhoneVerificationResult sendVerificationCode(String phoneNumber, Long storeId) {
        return sendVerificationCode(phoneNumber, storeId, "whatsapp");
    }

    @Transactional
    public PhoneVerificationResult sendVerificationCode(String phoneNumber, Long storeId, String requestedChannel) {
        // Validiere Telefonnummer
        if (!isValidPhoneNumber(phoneNumber)) {
            log.warn("❌ Invalid phone number format: {}", phoneNumber);
            return PhoneVerificationResult.error("Ungültige Telefonnummer. Bitte verwenden Sie das Format +212600123456");
        }

        // Rate Limiting: nur erfolgreich gesendete Codes zählen (channel != null)
        Optional<PhoneVerification> recent = verificationRepository
            .findFirstByPhoneNumberAndChannelIsNotNullOrderByCreatedAtDesc(phoneNumber);

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

        // Code generieren
        String code = generateVerificationCode();
        log.info("🔐 Sending verification code to {}", phoneNumber);

        // ── SCHRITT 1: Erst senden ────────────────────────────────────────────
        boolean sent = false;
        String channel = "unknown";

        // Telegram-Kanal: Code wird per Bot gesendet (kostenlos, kein API-Token nötig)
        if ("telegram".equalsIgnoreCase(requestedChannel) && telegramAuthBotService.isConfigured()) {
            // Token erstellen: phone_timestamp (wird als /start Parameter genutzt)
            String token = phoneNumber.replace("+", "") + "_" + System.currentTimeMillis();

            // Pending-Entry registrieren (in-memory, Controller hält es)
            TelegramAuthWebhookController.pendingByToken.put(token,
                new TelegramAuthWebhookController.PendingTelegramAuth(phoneNumber, code, System.currentTimeMillis()));

            // Verification vorab speichern (mit Code, wartet auf Bot-Bestätigung)
            PhoneVerification verification = new PhoneVerification();
            verification.setPhoneNumber(phoneNumber);
            verification.setCode(code);
            verification.setStoreId(storeId);
            verification.setChannel("telegram-pending");
            verification.setVerified(false);
            verification.setAttempts(0);
            verification.setCreatedAt(java.time.LocalDateTime.now());
            verification.setExpiresAt(java.time.LocalDateTime.now().plusMinutes(codeExpiryMinutes));
            verification = verificationRepository.save(verification);

            String telegramLink = "https://t.me/" + telegramAuthBotService.getBotUsername() + "?start=" + token;
            log.info("✅ [TelegramAuth] Deep-Link erstellt: {}", telegramLink);

            return PhoneVerificationResult.successTelegram(
                verification.getId(),
                "telegram",
                "Öffne Telegram und starte den Bot um deinen Code zu erhalten.",
                telegramLink,
                telegramAuthBotService.getBotUsername()
            );
        }

        try {
            if (whatsAppService.sendVerificationCode(phoneNumber, code)) {
                sent = true;
                channel = whatsAppService.isEnabled() ? "whatsapp" : "dev-log";
                log.info("✅ Code gesendet via {} an {}", channel, phoneNumber);
            }
        } catch (Exception e) {
            log.warn("❌ Senden fehlgeschlagen: {}", e.getMessage());
        }

        if (!sent) {
            return PhoneVerificationResult.error("Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.");
        }

        // ── SCHRITT 2: Nur bei Erfolg in DB speichern ────────────────────────
        PhoneVerification verification = new PhoneVerification();
        verification.setPhoneNumber(phoneNumber);
        verification.setCode(code);
        verification.setStoreId(storeId);
        verification.setChannel(channel);          // sofort gesetzt – kein null-Zustand
        verification.setVerified(false);
        verification.setAttempts(0);
        verification.setCreatedAt(LocalDateTime.now());
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(codeExpiryMinutes));
        verification = verificationRepository.save(verification);

        log.info("💾 Verification gespeichert (ID: {})", verification.getId());

        String message = channel.equals("dev-log")
            ? String.format("[DEV] Code in Backend-Logs. Gültig %d Minuten.", codeExpiryMinutes)
            : String.format("Code per %s gesendet. Gültig %d Minuten.",
                channel.equals("whatsapp") ? "WhatsApp" : "SMS", codeExpiryMinutes);

        // Im DEV-Modus: Code direkt in Result mitgeben (wird im Frontend angezeigt)
        if (channel.equals("dev-log")) {
            return PhoneVerificationResult.successDev(verification.getId(), channel, message, code);
        }
        return PhoneVerificationResult.success(verification.getId(), channel, message);
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
     * Gibt die Telefonnummer einer Verifizierung zurück (für Phone-Auth-Flow)
     */
    @Transactional(readOnly = true)
    public String getPhoneNumberByVerificationId(Long verificationId) {
        return verificationRepository.findById(verificationId)
            .map(PhoneVerification::getPhoneNumber)
            .orElse(null);
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
        if (phoneNumber == null || phoneNumber.isBlank()) return false;

        // Muss mit + beginnen (E.164 Format)
        if (!phoneNumber.startsWith("+")) return false;

        // Nur Ziffern nach dem +
        String digits = phoneNumber.substring(1);
        if (!digits.matches("\\d+")) return false;

        // Mindestens 9 Ziffern nach +, maximal 15 (E.164 Standard)
        // Marokko: +212 + 9 Ziffern = 12 Zeichen gesamt
        int len = digits.length();
        if (len < 9 || len > 15) return false;

        return true;
    }

    // Result Class
    public static class PhoneVerificationResult {
        private final boolean success;
        private final Long verificationId;
        private final String channel;
        private final String message;
        private final String devCode;
        private final String telegramLink;   // nur für telegram-Kanal
        private final String botUsername;    // nur für telegram-Kanal

        private PhoneVerificationResult(boolean success, Long verificationId, String channel,
                                         String message, String devCode, String telegramLink, String botUsername) {
            this.success = success;
            this.verificationId = verificationId;
            this.channel = channel;
            this.message = message;
            this.devCode = devCode;
            this.telegramLink = telegramLink;
            this.botUsername = botUsername;
        }

        public static PhoneVerificationResult success(Long verificationId, String channel, String message) {
            return new PhoneVerificationResult(true, verificationId, channel, message, null, null, null);
        }

        public static PhoneVerificationResult successDev(Long verificationId, String channel, String message, String code) {
            return new PhoneVerificationResult(true, verificationId, channel, message, code, null, null);
        }

        public static PhoneVerificationResult successTelegram(Long verificationId, String channel,
                                                               String message, String telegramLink, String botUsername) {
            return new PhoneVerificationResult(true, verificationId, channel, message, null, telegramLink, botUsername);
        }

        public static PhoneVerificationResult error(String message) {
            return new PhoneVerificationResult(false, null, null, message, null, null, null);
        }

        public boolean isSuccess() { return success; }
        public Long getVerificationId() { return verificationId; }
        public String getChannel() { return channel; }
        public String getMessage() { return message; }
        public String getDevCode() { return devCode; }
        public String getTelegramLink() { return telegramLink; }
        public String getBotUsername() { return botUsername; }
    }
}

