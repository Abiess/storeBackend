package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Telegram Auth Bot – sendet Verifizierungscodes für den Quick-Start-Flow.
 * Separater Bot vom Store-Telegram-Bot (der ist per Store konfiguriert).
 *
 * Konfiguration:
 *   telegram.auth.bot-token=DEIN_BOT_TOKEN
 *   telegram.auth.bot-username=marktma_verify_bot
 *
 * DEV: telegram.enabled=false → Code wird nur geloggt
 */
@Service
@Slf4j
public class TelegramAuthBotService {

    private static final String TELEGRAM_API = "https://api.telegram.org/bot";

    @Value("${telegram.auth.bot-token:}")
    private String botToken;

    @Value("${telegram.auth.bot-username:marktma_verify_bot}")
    private String botUsername;

    @Value("${telegram.enabled:false}")
    private boolean enabled;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isConfigured() {
        return enabled && botToken != null && !botToken.isBlank();
    }

    public String getBotUsername() {
        return botUsername;
    }

    /**
     * Sendet einen Verifizierungscode an einen Telegram-Chat.
     * @param chatId  Telegram Chat-ID des Users
     * @param code    6-stelliger Code
     * @param phone   Telefonnummer (für Anzeige)
     */
    public boolean sendVerificationCode(String chatId, String code, String phone) {
        if (!isConfigured()) {
            log.info("========================================");
            log.info("[TelegramAuth/DEV] SIMULATED SEND");
            log.info("[TelegramAuth/DEV] To ChatID: {}", chatId);
            log.info("[TelegramAuth/DEV] Verification code: {}", code);
            log.info("========================================");
            return true;
        }

        String text = String.format(
            "🔐 <b>markt.ma – Verifizierungscode</b>\n\n" +
            "Dein Code für <code>%s</code>:\n\n" +
            "<b>%s</b>\n\n" +
            "⏱ Gültig 10 Minuten. Bitte nicht weitergeben.",
            phone, code
        );

        return sendMessage(chatId, text);
    }

    public boolean sendMessage(String chatId, String text) {
        if (!isConfigured()) {
            log.info("[TelegramAuth/DEV] Simulated: → {} : {}", chatId, text);
            return true;
        }
        try {
            String url = TELEGRAM_API + botToken + "/sendMessage";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "HTML"
            );
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(url, request, String.class);
            if (resp.getStatusCode().is2xxSuccessful()) {
                log.info("✅ [TelegramAuth] Code gesendet an Chat {}", chatId);
                return true;
            }
            log.warn("❌ [TelegramAuth] sendMessage failed: {}", resp.getStatusCode());
            return false;
        } catch (Exception e) {
            log.error("❌ [TelegramAuth] sendMessage error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Registriert den Webhook bei Telegram (einmalig beim Start oder manuell).
     * Webhook-URL: https://api.markt.ma/api/auth/telegram-webhook
     */
    public void registerWebhook(String webhookUrl) {
        if (!isConfigured()) {
            log.info("[TelegramAuth/DEV] Webhook-Registrierung übersprungen (bot-token nicht konfiguriert)");
            return;
        }
        try {
            String url = TELEGRAM_API + botToken + "/setWebhook";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = Map.of(
                "url", webhookUrl,
                "allowed_updates", new String[]{"message"}
            );
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(url, request, String.class);
            log.info("✅ [TelegramAuth] Webhook registriert: {} → {}", webhookUrl, resp.getBody());
        } catch (Exception e) {
            log.error("❌ [TelegramAuth] Webhook-Registrierung fehlgeschlagen: {}", e.getMessage());
        }
    }

    /**
     * Liest Chat-Info über getUpdates – nur für initiales Setup/Debugging.
     */
    public String getBotInfo() {
        if (!isConfigured()) return "Bot nicht konfiguriert";
        try {
            String url = TELEGRAM_API + botToken + "/getMe";
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            return resp.getBody();
        } catch (Exception e) {
            return "Fehler: " + e.getMessage();
        }
    }
}

