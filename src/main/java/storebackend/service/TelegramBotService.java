package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import storebackend.dto.TelegramMessageDto;
import storebackend.entity.Order;
import storebackend.entity.Product;
import storebackend.entity.TelegramStoreConfig;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Telegram Bot API Service – analog zu WhatsAppService.
 *
 * Nutzt ausschließlich die Telegram Bot REST-API (kein Python/MTProto):
 *   https://api.telegram.org/bot{token}/{method}
 *
 * Voraussetzung: Bot muss als Admin im Channel eingetragen sein.
 *
 * Konfiguration in application.properties:
 *   telegram.enabled=true/false
 */
@Service
@Slf4j
public class TelegramBotService {

    private static final String TELEGRAM_API = "https://api.telegram.org/bot";

    @Value("${telegram.enabled:false}")
    private boolean enabled;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────────────────────────
    // Nachrichten senden
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sendet eine Text-Nachricht an einen Chat/Channel.
     * MarkdownV2-Format wird unterstützt.
     */
    public boolean sendMessage(String chatId, String text, String botToken) {
        if (!enabled || !isTokenValid(botToken)) {
            return simulateSend(chatId, text, botToken);
        }
        try {
            String url = TELEGRAM_API + botToken + "/sendMessage";
            Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "HTML"
            );
            return doPost(url, body, botToken);
        } catch (Exception e) {
            log.error("[Telegram] sendMessage failed for {}: {}", chatId, e.getMessage());
            return false;
        }
    }

    /**
     * Sendet ein Bild mit optionalem Caption-Text.
     */
    public boolean sendPhoto(String chatId, String imageUrl, String caption, String botToken) {
        if (!enabled || !isTokenValid(botToken)) {
            log.info("[Telegram/DEV] SIMULATED sendPhoto to {} url={}", chatId, imageUrl);
            return true;
        }
        try {
            String url = TELEGRAM_API + botToken + "/sendPhoto";
            Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "photo", imageUrl,
                "caption", caption != null ? caption : "",
                "parse_mode", "HTML"
            );
            return doPost(url, body, botToken);
        } catch (Exception e) {
            log.error("[Telegram] sendPhoto failed for {}: {}", chatId, e.getMessage());
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Business-Methoden (Order-Notifications)
    // ─────────────────────────────────────────────────────────────────────────

    /** Neue Bestellung → Benachrichtigung an Store-Owner */
    public boolean sendNewOrderNotification(TelegramStoreConfig cfg, Order order) {
        if (!isConfigured(cfg) || !cfg.isNotifyNewOrders()) return false;

        String lang = order.getStore() != null && order.getStore().getOwner() != null
            ? order.getStore().getOwner().getPreferredLanguage() : "en";

        String text = buildOrderMessage(lang,
            "🛍️ <b>Neue Bestellung!</b>\n\nNr: <code>%s</code>\nShop: %s\nGesamt: <b>%.2f €</b>\nKunde: %s",
            "🛍️ <b>New Order!</b>\n\nNo: <code>%s</code>\nShop: %s\nTotal: <b>€%.2f</b>\nCustomer: %s",
            "🛍️ <b>طلب جديد!</b>\n\nرقم: <code>%s</code>\nالمتجر: %s\nالمجموع: <b>%.2f €</b>\nالعميل: %s",
            order.getOrderNumber(),
            order.getStore() != null ? order.getStore().getName() : "-",
            order.getTotalAmount().doubleValue(),
            order.getCustomerEmail() != null ? order.getCustomerEmail() : "-"
        );

        return sendMessage(cfg.getChannelId(), text, cfg.getBotToken());
    }

    /** Niedriger Lagerbestand → Alert */
    public boolean sendLowStockAlert(TelegramStoreConfig cfg, Product product, int currentStock) {
        if (!isConfigured(cfg) || !cfg.isNotifyLowStock()) return false;

        String text = String.format(
            "⚠️ <b>Low Stock Alert</b>\n\nProdukt: <b>%s</b>\nLagerbestand: <b>%d</b>",
            product.getTitle(), currentStock
        );
        return sendMessage(cfg.getChannelId(), text, cfg.getBotToken());
    }

    /** Neues Produkt in Channel posten */
    public boolean postNewProductToChannel(TelegramStoreConfig cfg, Product product) {
        if (!isConfigured(cfg) || !cfg.isPostNewProducts()) return false;

        String caption = String.format(
            "🆕 <b>%s</b>\n💶 %.2f €\n\n%s",
            product.getTitle(),
            product.getBasePrice().doubleValue(),
            product.getDescription() != null
                ? product.getDescription().substring(0, Math.min(200, product.getDescription().length()))
                : ""
        );
        return sendMessage(cfg.getChannelId(), caption, cfg.getBotToken());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Channel-Verlauf abrufen (Polling / Import)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Holt die letzten Nachrichten des Channels via getUpdates (Polling).
     * Bot muss Channel-Admin sein.
     * Gibt maximal {@code limit} Nachrichten zurück.
     */
    public List<TelegramMessageDto> getChannelHistory(String channelId, String botToken, int limit) {
        List<TelegramMessageDto> result = new ArrayList<>();

        if (!isTokenValid(botToken)) {
            log.warn("[Telegram] getChannelHistory skipped – invalid token");
            return result;
        }

        try {
            // getUpdates liefert die letzten Events des Bots (inkl. Channel-Posts)
            String url = TELEGRAM_API + botToken + "/getUpdates?limit=" + Math.min(limit, 100) + "&allowed_updates=[\"channel_post\"]";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("[Telegram] getUpdates returned {}", response.getStatusCode());
                return result;
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            if (!root.path("ok").asBoolean()) {
                log.warn("[Telegram] getUpdates not ok: {}", response.getBody());
                return result;
            }

            for (JsonNode update : root.path("result")) {
                JsonNode post = update.path("channel_post");
                if (post.isMissingNode()) continue;

                // Nur Posts aus dem konfigurierten Channel
                String fromChat = post.path("chat").path("username").asText("");
                String fromChatId = String.valueOf(post.path("chat").path("id").asLong());
                if (!channelId.equals("@" + fromChat) && !channelId.equals(fromChatId)) continue;

                TelegramMessageDto msg = new TelegramMessageDto();
                msg.setMessageId(post.path("message_id").asLong());
                msg.setText(post.path("text").asText(post.path("caption").asText("")));
                msg.setDate(post.path("date").asText());
                msg.setFromChannel(channelId);

                // Fotos extrahieren
                List<String> photos = new ArrayList<>();
                JsonNode photoArr = post.path("photo");
                if (photoArr.isArray() && !photoArr.isEmpty()) {
                    // Größtes Foto nehmen (letztes Element)
                    String fileId = photoArr.get(photoArr.size() - 1).path("file_id").asText();
                    String photoUrl = resolveFileUrl(fileId, botToken);
                    if (photoUrl != null) photos.add(photoUrl);
                }
                msg.setPhotoUrls(photos);

                result.add(msg);
            }

            log.info("[Telegram] getChannelHistory: {} posts retrieved from {}", result.size(), channelId);
        } catch (Exception e) {
            log.error("[Telegram] getChannelHistory failed: {}", e.getMessage());
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Verbindungstest
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Testet ob Bot-Token gültig ist (getMe) und sendet eine Test-Nachricht.
     */
    public boolean testConnection(TelegramStoreConfig cfg) {
        if (!isTokenValid(cfg.getBotToken())) return false;
        try {
            String url = TELEGRAM_API + cfg.getBotToken() + "/getMe";
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            if (!resp.getStatusCode().is2xxSuccessful()) return false;

            // Test-Nachricht senden
            return sendMessage(cfg.getChannelId(), "✅ <b>Telegram Bot</b> erfolgreich verbunden mit markt.ma! 🎉", cfg.getBotToken());
        } catch (Exception e) {
            log.error("[Telegram] testConnection failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Prüft ob Bot-Token gültig ist (nur getMe, keine Nachricht).
     */
    public boolean validateToken(String botToken) {
        if (!isTokenValid(botToken)) return false;
        try {
            String url = TELEGRAM_API + botToken + "/getMe";
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            return resp.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isEnabled() { return enabled; }

    public boolean isConfigured(TelegramStoreConfig cfg) {
        return cfg != null && cfg.isActive()
            && isTokenValid(cfg.getBotToken())
            && cfg.getChannelId() != null && !cfg.getChannelId().isBlank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private boolean doPost(String url, Map<String, Object> body, String botToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[Telegram] Message sent successfully");
                return true;
            }
            log.warn("[Telegram] API returned {}: {}", response.getStatusCode(), response.getBody());
            return false;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[Telegram] API client error: HTTP {} | {}", e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("[Telegram] doPost failed: {}", e.getMessage());
            return false;
        }
    }

    /** Löst eine Telegram file_id in eine Download-URL auf. */
    private String resolveFileUrl(String fileId, String botToken) {
        try {
            String url = TELEGRAM_API + botToken + "/getFile?file_id=" + fileId;
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            if (!resp.getStatusCode().is2xxSuccessful()) return null;
            JsonNode root = objectMapper.readTree(resp.getBody());
            String filePath = root.path("result").path("file_path").asText(null);
            if (filePath == null) return null;
            return "https://api.telegram.org/file/bot" + botToken + "/" + filePath;
        } catch (Exception e) {
            log.warn("[Telegram] resolveFileUrl failed for fileId {}: {}", fileId, e.getMessage());
            return null;
        }
    }

    private boolean isTokenValid(String token) {
        return token != null && !token.isBlank() && token.contains(":");
    }

    private boolean simulateSend(String chatId, String text, String botToken) {
        log.info("========================================");
        log.info("[Telegram/DEV] SIMULATED SEND (telegram.enabled=false)");
        log.info("[Telegram/DEV] To:      {}", chatId);
        log.info("[Telegram/DEV] Message: {}", text);
        log.info("[Telegram/DEV] Set telegram.enabled=true + bot_token für echte Nachrichten");
        log.info("========================================");
        return true;
    }

    private String buildOrderMessage(String lang, String de, String en, String ar,
                                     String orderNumber, String storeName, double total, String customer) {
        String tpl = switch (lang != null ? lang : "en") {
            case "de" -> de;
            case "ar" -> ar;
            default   -> en;
        };
        return String.format(tpl, orderNumber, storeName, total, customer);
    }
}

