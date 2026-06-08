package storebackend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.service.PhoneVerificationService;
import storebackend.service.TelegramAuthBotService;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Empfängt Telegram Bot Updates (Webhook) für den Auth-Flow.
 *
 * Flow:
 *   1. User öffnet t.me/{bot}?start={phone}-{token}
 *   2. Telegram sendet POST an /api/auth/telegram-webhook
 *   3. Dieser Controller findet die Verifizierung, sendet Code an User
 *
 * Webhook registrieren:
 *   GET /api/auth/telegram-webhook/setup (einmalig)
 */
@RestController
@RequestMapping("/api/auth/telegram-webhook")
@RequiredArgsConstructor
@Slf4j
public class TelegramAuthWebhookController {

    private final TelegramAuthBotService telegramAuthBotService;
    private final PhoneVerificationService phoneVerificationService;

    @Value("${app.base-url:https://markt.ma}")
    private String appBaseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // chatId → phone mapping (in-memory, reicht für Verifizierung)
    // Wird befüllt wenn User /start sendet, genutzt um Code zu senden
    public static final ConcurrentHashMap<String, PendingTelegramAuth> pendingByToken = new ConcurrentHashMap<>();

    public record PendingTelegramAuth(String phone, String code, long createdAt) {}

    /**
     * Telegram sendet Updates an diesen Endpoint.
     * Content-Type: application/json
     */
    @PostMapping
    public ResponseEntity<String> handleUpdate(@RequestBody String payload) {
        try {
            JsonNode update = objectMapper.readTree(payload);
            JsonNode message = update.path("message");
            if (message.isMissingNode()) return ResponseEntity.ok("ok");

            String text = message.path("text").asText("");
            String chatId = message.path("chat").path("id").asText("");
            String firstName = message.path("from").path("first_name").asText("Nutzer");

            log.info("📩 [TelegramAuth] Update von Chat {}: {}", chatId, text);

            // /start TOKEN verarbeiten
            if (text.startsWith("/start")) {
                String token = text.replace("/start", "").trim();
                handleStart(chatId, firstName, token);
            }

        } catch (Exception e) {
            log.error("❌ [TelegramAuth] Webhook-Fehler: {}", e.getMessage());
        }
        return ResponseEntity.ok("ok");
    }

    private void handleStart(String chatId, String firstName, String token) {
        if (token.isEmpty()) {
            // Kein Token → Willkommensnachricht
            telegramAuthBotService.sendMessage(chatId,
                "👋 Hallo <b>" + firstName + "</b>!\n\n" +
                "Ich bin der markt.ma Verifizierungsbot.\n" +
                "Bitte starte den Prozess auf <a href=\"https://markt.ma/quick-start\">markt.ma</a> und klicke auf den Telegram-Link.");
            return;
        }

        // Token ist: phone_verificationId (z.B. "212600123456_42")
        PendingTelegramAuth pending = pendingByToken.get(token);
        if (pending == null) {
            telegramAuthBotService.sendMessage(chatId,
                "⚠️ <b>Ungültiger oder abgelaufener Link.</b>\n\n" +
                "Bitte gehe zurück zu <a href=\"https://markt.ma/quick-start\">markt.ma</a> und fordere einen neuen Code an.");
            return;
        }

        // Code senden
        boolean sent = telegramAuthBotService.sendVerificationCode(chatId, pending.code(), pending.phone());
        if (sent) {
            log.info("✅ [TelegramAuth] Code {} gesendet an ChatID {} für {}", pending.code(), chatId, pending.phone());
            // Token nach Versand entfernen (One-Time-Use)
            pendingByToken.remove(token);
            telegramAuthBotService.sendMessage(chatId,
                "✅ <b>Code gesendet!</b>\n\n" +
                "Dein Code: <b>" + pending.code() + "</b>\n\n" +
                "⏱ Gültig 10 Minuten.");
        }
    }

    /**
     * Einmaliges Setup: Webhook bei Telegram registrieren.
     * Aufruf: GET /api/auth/telegram-webhook/setup
     */
    @GetMapping("/setup")
    public ResponseEntity<String> setupWebhook() {
        String webhookUrl = appBaseUrl.replace("https://", "https://api.") + "/api/auth/telegram-webhook";
        // Korrekte API-URL
        webhookUrl = "https://api.markt.ma/api/auth/telegram-webhook";
        telegramAuthBotService.registerWebhook(webhookUrl);
        return ResponseEntity.ok("✅ Webhook registriert: " + webhookUrl);
    }

    /**
     * Bot-Info abrufen (Debugging)
     */
    @GetMapping("/info")
    public ResponseEntity<String> botInfo() {
        return ResponseEntity.ok(telegramAuthBotService.getBotInfo());
    }
}

