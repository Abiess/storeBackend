package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import storebackend.dto.*;
import storebackend.entity.*;
import storebackend.enums.ProductStatus;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * MTProto Channel Importer Service.
 *
 * Ruft den Python Telethon Microservice auf um Channels zu lesen.
 * Importiert Posts als Produkt-Entwürfe (Status DRAFT) für manuelle Review.
 *
 * Klare Trennung:
 *   Dieser Service  = Lesen (MTProto, api_id + api_hash)
 *   TelegramBotService = Schreiben / Benachrichtigungen (Bot Token)
 */
@Service
@Slf4j
public class TelegramMtprotoService {

    @Value("${telegram.scraper.url:http://localhost:8001}")
    private String scraperUrl;

    private final TelegramMtprotoConfigRepository mtprotoRepository;
    private final TelegramImportLogRepository importLogRepository;
    private final StoreRepository storeRepository;
    private final ProductService productService;
    private final CategoryService categoryService;
    private final CategoryRepository categoryRepository;
    private final MediaService mediaService;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate;

    public TelegramMtprotoService(
            TelegramMtprotoConfigRepository mtprotoRepository,
            TelegramImportLogRepository importLogRepository,
            StoreRepository storeRepository,
            ProductService productService,
            CategoryService categoryService,
            CategoryRepository categoryRepository,
            MediaService mediaService,
            ObjectMapper objectMapper) {
        this.mtprotoRepository = mtprotoRepository;
        this.importLogRepository = importLogRepository;
        this.storeRepository = storeRepository;
        this.productService = productService;
        this.categoryService = categoryService;
        this.categoryRepository = categoryRepository;
        this.mediaService = mediaService;
        this.objectMapper = objectMapper;

        // Timeout: 5s connect, 60s read (Telegram-Code kann länger dauern)
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(60_000);
        this.restTemplate = new RestTemplate(factory);
    }

    private static final Pattern PRICE_PATTERN = Pattern.compile(
        "(\\d{1,6}(?:[.,]\\d{1,3})?)\\s*(?:€|\\$|MAD|DH|DZD|درهم|دج|EUR|USD)",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#([\\w\\u0600-\\u06FF]+)");

    // ─────────────────────────────────────────────────────────────────────────
    // Auth Flow: Code anfordern → Code verifizieren → Session speichern
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Schritt 1: Sendet Verifizierungscode an Telefonnummer via Telegram.
     * Gibt phone_code_hash zurück (wird für Schritt 2 benötigt).
     */
    @Transactional
    public String requestAuthCode(Long storeId, Integer apiId, String apiHash, String phone) {
        log.info("[MTProto] Requesting auth code for store={}, phone={}", storeId, phone);

        ObjectNode body = objectMapper.createObjectNode();
        body.put("api_id", apiId);
        body.put("api_hash", apiHash);
        body.put("phone", phone);

        JsonNode response = postToScraper("/auth/request-code", body);
        String phoneCodeHash = response.path("phone_code_hash").asText();
        String authSession   = response.path("auth_session_string").asText();

        if (phoneCodeHash == null || phoneCodeHash.isBlank()) {
            throw new RuntimeException("Kein phone_code_hash erhalten vom Scraper");
        }

        // Config vorbeugen erstellen / aktualisieren
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId)
            .orElseGet(() -> {
                TelegramMtprotoConfig c = new TelegramMtprotoConfig();
                c.setStore(store);
                return c;
            });
        cfg.setApiId(apiId);
        cfg.setApiHash(apiHash);
        cfg.setPhone(phone);
        cfg.setPendingPhoneCodeHash(phoneCodeHash);
        cfg.setPendingAuthSession(authSession.isBlank() ? null : authSession);  // Teil-Session merken
        cfg.setAuthenticated(false);
        mtprotoRepository.save(cfg);

        log.info("[MTProto][E2E] request-code gespeichert storeId={} phoneCodeHashLen={} authSessionPersisted={}",
            storeId, phoneCodeHash.length(), !authSession.isBlank());

        return phoneCodeHash;
    }

    /**
     * Schritt 2: Verifiziert Code → empfängt und speichert session_string.
     */
    @Transactional
    public TelegramMtprotoConfig verifyAuthCode(Long storeId, String code, String password) {
        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException("Keine ausstehende Auth-Anfrage. Erst Schritt 1 ausführen."));

        if (cfg.getPendingPhoneCodeHash() == null) {
            throw new RuntimeException("Kein ausstehender Auth-Code. Erst Schritt 1 ausführen.");
        }

        // ── E2E Diagnose-Logging ───────────────────────────────────────────────
        String hashPreview = cfg.getPendingPhoneCodeHash().length() > 6
            ? cfg.getPendingPhoneCodeHash().substring(0, 6) + "..."
            : cfg.getPendingPhoneCodeHash();
        String sessionPreview = cfg.getPendingAuthSession() != null
            ? "len=" + cfg.getPendingAuthSession().length() + " prefix=" + cfg.getPendingAuthSession().substring(0, Math.min(10, cfg.getPendingAuthSession().length())) + "..."
            : "NULL";
        log.info("[MTProto][E2E] verify storeId={} phone={} hasPendingPhoneCodeHash={} phoneCodeHashLen={} hashPrefix={} hasPendingAuthSession={} sessionInfo=({})",
            storeId,
            cfg.getPhone(),
            cfg.getPendingPhoneCodeHash() != null,
            cfg.getPendingPhoneCodeHash().length(),
            hashPreview,
            cfg.getPendingAuthSession() != null,
            sessionPreview
        );
        // ──────────────────────────────────────────────────────────────────────

        ObjectNode body = objectMapper.createObjectNode();
        body.put("api_id", cfg.getApiId());
        body.put("api_hash", cfg.getApiHash());
        body.put("phone", cfg.getPhone());
        body.put("code", code);
        body.put("phone_code_hash", cfg.getPendingPhoneCodeHash());
        // Teil-Session aus Schritt 1 mitsenden – KRITISCH für korrekte Session-Kontinuität
        if (cfg.getPendingAuthSession() != null && !cfg.getPendingAuthSession().isBlank()) {
            body.put("auth_session_string", cfg.getPendingAuthSession());
            log.info("[MTProto][E2E] auth_session_string wird mitgesendet (len={})", cfg.getPendingAuthSession().length());
        } else {
            log.warn("[MTProto][E2E] ⚠️  KEIN auth_session_string! Python nutzt Fallback oder cached client.");
        }
        if (password != null && !password.isBlank()) {
            body.put("password", password);
        }

        JsonNode response;
        try {
            log.info("[MTProto][E2E] Sende verify-code Request an Python-Scraper...");
            response = postToScraper("/auth/verify-code", body);
            log.info("[MTProto][E2E] ✅ verify-code erfolgreich – Session erhalten");
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            log.error("[MTProto][E2E] ❌ verify-code Fehler: '{}'", msg);
            // Code abgelaufen → Hash zurücksetzen, damit User erneut Code anfordern kann
            if (msg.toLowerCase().contains("abgelaufen") || msg.toLowerCase().contains("expired")) {
                cfg.setPendingPhoneCodeHash(null);
                cfg.setPendingAuthSession(null);
                cfg.setAuthenticated(false);
                mtprotoRepository.save(cfg);
                log.warn("[MTProto][E2E] Code für store={} abgelaufen – Hash + Session zurückgesetzt", storeId);
            }
            throw e;
        }
        String sessionString = response.path("session_string").asText();

        if (sessionString == null || sessionString.isBlank()) {
            throw new RuntimeException("Kein session_string erhalten");
        }

        cfg.setSessionString(sessionString);
        cfg.setAuthenticated(true);
        cfg.setPendingPhoneCodeHash(null);
        cfg.setPendingAuthSession(null);  // Teil-Session nicht mehr benötigt
        return mtprotoRepository.save(cfg);
    }

    /**
     * Prüft ob Session noch gültig ist.
     */
    public boolean checkSession(Long storeId) {
        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId).orElse(null);
        if (cfg == null || cfg.getSessionString() == null) return false;

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("api_id", cfg.getApiId());
            body.put("api_hash", cfg.getApiHash());
            body.put("session_string", cfg.getSessionString());

            JsonNode response = postToScraper("/auth/check-session", body);
            boolean valid = response.path("valid").asBoolean(false);

            if (!valid && cfg.isAuthenticated()) {
                cfg.setAuthenticated(false);
                mtprotoRepository.save(cfg);
            }
            return valid;
        } catch (Exception e) {
            log.warn("[MTProto] checkSession error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Logout – invalidiert Session.
     */
    @Transactional
    public void logout(Long storeId) {
        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId).orElse(null);
        if (cfg == null || cfg.getSessionString() == null) return;

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("api_id", cfg.getApiId());
            body.put("api_hash", cfg.getApiHash());
            body.put("session_string", cfg.getSessionString());
            postToScraper("/auth/logout", body);
        } catch (Exception e) {
            log.warn("[MTProto] logout error: {}", e.getMessage());
        }

        cfg.setSessionString(null);
        cfg.setAuthenticated(false);
        mtprotoRepository.save(cfg);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Channel-Verwaltung
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Listet alle abonnierten Channels des Telegram-Accounts.
     */
    public JsonNode listChannels(Long storeId) {
        TelegramMtprotoConfig cfg = getAuthenticatedConfig(storeId);

        ObjectNode body = objectMapper.createObjectNode();
        body.put("api_id", cfg.getApiId());
        body.put("api_hash", cfg.getApiHash());
        body.put("session_string", cfg.getSessionString());

        return postToScraper("/channels/list", body);
    }

    /**
     * Speichert die Channels die überwacht/importiert werden sollen.
     */
    @Transactional
    public TelegramMtprotoConfig updateWatchedChannels(Long storeId, List<String> channels) {
        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException("Keine Konfiguration gefunden"));

        try {
            cfg.setWatchedChannels(objectMapper.writeValueAsString(channels));
        } catch (Exception e) {
            cfg.setWatchedChannels("[]");
        }
        return mtprotoRepository.save(cfg);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Import
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Importiert Posts aus einem Channel als Produkt-Entwürfe.
     * Nur Posts mit Medien (Bilder) werden verarbeitet.
     *
     * @param storeId  Store ID
     * @param channel  Channel @username oder ID
     * @param owner    Store-Besitzer (für Produkt-Erstellung)
     * @return Import-Ergebnis
     */
    @Transactional
    public TelegramImportResultDto importChannel(Long storeId, String channel, User owner) {
        TelegramImportResultDto result = new TelegramImportResultDto();
        TelegramMtprotoConfig cfg = getAuthenticatedConfig(storeId);
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        // Letzte importierte Message-ID für Delta-Import
        int lastMsgId = getLastMessageId(cfg, channel);

        // Posts vom Python-Service holen
        ObjectNode body = objectMapper.createObjectNode();
        body.put("api_id", cfg.getApiId());
        body.put("api_hash", cfg.getApiHash());
        body.put("session_string", cfg.getSessionString());
        body.put("channel", channel);
        body.put("limit", cfg.getImportLimit());
        body.put("min_id", lastMsgId);

        JsonNode response;
        try {
            response = postToScraper("/channels/history", body);
        } catch (Exception e) {
            throw new RuntimeException("Scraper nicht erreichbar: " + e.getMessage());
        }

        JsonNode posts = response.path("posts");
        log.info("[MTProto] {} Posts erhalten aus channel={}", posts.size(), channel);

        int maxMsgId = lastMsgId;

        for (JsonNode post : posts) {
            long msgId = post.path("message_id").asLong();
            String text = post.path("text").asText("");
            boolean hasMedia = post.path("has_media").asBoolean(false);

            // Duplikat-Check
            if (importLogRepository.existsByStoreIdAndChannelIdAndTelegramMsgId(
                    storeId, channel, msgId)) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }

            // Nur Posts mit Inhalt importieren
            if (text.isBlank() && !hasMedia) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }

            try {
                // Produkt aus Post erstellen
                Long productId = createProductFromPost(post, store, owner, channel);

                // Log-Eintrag
                saveMtprotoLog(store, channel, msgId, productId, "SUCCESS", null);
                result.setImported(result.getImported() + 1);

                String title = extractTitle(text);
                result.getImportedTitles().add(title.isEmpty() ? "Post #" + msgId : title);

                if (msgId > maxMsgId) maxMsgId = (int) msgId;

                log.info("[MTProto] ✅ Importiert: msgId={}, productId={}", msgId, productId);
            } catch (Exception e) {
                log.error("[MTProto] Fehler bei msgId={}: {}", msgId, e.getMessage());
                saveMtprotoLog(store, channel, msgId, null, "ERROR", e.getMessage());
                result.setErrors(result.getErrors() + 1);
                result.getErrorMessages().add("msgId=" + msgId + ": " + e.getMessage());
            }
        }

        // Letzte Message-ID aktualisieren (für nächsten inkrementellen Import)
        if (maxMsgId > lastMsgId) {
            updateLastMessageId(cfg, channel, maxMsgId);
        }

        return result;
    }

    /**
     * Importiert aus allen überwachten Channels des Stores.
     */
    @Transactional
    public Map<String, TelegramImportResultDto> importAllWatchedChannels(Long storeId, User owner) {
        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException("Keine Konfiguration"));

        List<String> channels = parseChannelList(cfg.getWatchedChannels());
        Map<String, TelegramImportResultDto> results = new LinkedHashMap<>();

        for (String channel : channels) {
            try {
                results.put(channel, importChannel(storeId, channel, owner));
            } catch (Exception e) {
                log.error("[MTProto] Fehler beim Import von {}: {}", channel, e.getMessage());
                TelegramImportResultDto errResult = new TelegramImportResultDto();
                errResult.setErrors(1);
                errResult.getErrorMessages().add(e.getMessage());
                results.put(channel, errResult);
            }
        }
        return results;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Produkt aus Post erstellen
    // ─────────────────────────────────────────────────────────────────────────

    private Long createProductFromPost(JsonNode post, Store store, User owner, String channel)
            throws Exception {
        String text = post.path("text").asText("");
        String title = extractTitle(text);
        if (title.isBlank()) title = "Telegram Import – Channel: " + channel;

        BigDecimal price = extractPrice(text);
        if (price == null) price = BigDecimal.ZERO;

        List<String> hashtags = extractHashtags(text);
        String description = buildDescription(text, channel, post.path("date").asText(""));

        // Kategorie aus erstem Hashtag
        Long categoryId = null;
        if (!hashtags.isEmpty()) {
            categoryId = findOrCreateCategory(store, hashtags.get(0));
        }

        // Produkt als DRAFT erstellen
        CreateProductRequest req = new CreateProductRequest();
        req.setTitle(title);
        req.setDescription(description);
        req.setBasePrice(price);
        req.setStatus(ProductStatus.DRAFT);   // ← Immer DRAFT für manuelle Review
        req.setStock(0);
        req.setCategoryId(categoryId);

        var productDto = productService.createProduct(req, store, owner);

        // Bilder speichern (Base64 → MinIO)
        JsonNode photoBytesArr = post.path("photo_bytes_list");
        if (photoBytesArr.isArray()) {
            for (JsonNode photoNode : photoBytesArr) {
                String b64 = photoNode.asText();
                if (b64 != null && !b64.isBlank()) {
                    try {
                        mediaService.uploadFromBase64(store, b64, title + " (Telegram)");
                    } catch (Exception imgErr) {
                        log.warn("[MTProto] Bild-Upload fehlgeschlagen: {}", imgErr.getMessage());
                    }
                }
            }
        }

        return productDto.getId();
    }

    private String buildDescription(String text, String channel, String date) {
        StringBuilder sb = new StringBuilder();
        if (!text.isBlank()) {
            sb.append(text.replaceAll("#\\w+", "").trim());
        }
        sb.append("\n\n---\n");
        sb.append("📱 Importiert aus: ").append(channel).append("\n");
        if (!date.isBlank()) sb.append("📅 Datum: ").append(date.substring(0, 10)).append("\n");
        sb.append("⚠️ Bitte vor Veröffentlichung prüfen.");
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scraper HTTP-Aufruf
    // ─────────────────────────────────────────────────────────────────────────

    private JsonNode postToScraper(String path, Object body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Object> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                scraperUrl + path, request, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Scraper error " + response.getStatusCode());
            }
            return objectMapper.readTree(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String errBody = e.getResponseBodyAsString();
            // FastAPI gibt {"detail": "..."} zurück – detail extrahieren
            try {
                JsonNode errJson = objectMapper.readTree(errBody);
                // "detail" kann String oder Objekt sein
                JsonNode detailNode = errJson.path("detail");
                String detail;
                if (detailNode.isTextual()) {
                    detail = detailNode.asText();
                } else if (!detailNode.isMissingNode()) {
                    detail = detailNode.toString();
                } else {
                    // Kein "detail" → ganzen Body nehmen
                    detail = errBody;
                }
                throw new RuntimeException(detail);
            } catch (RuntimeException re) {
                throw re;
            } catch (Exception ex) {
                throw new RuntimeException(errBody);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Scraper HTTP error: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parser
    // ─────────────────────────────────────────────────────────────────────────

    private BigDecimal extractPrice(String text) {
        if (text == null) return null;
        Matcher m = PRICE_PATTERN.matcher(text);
        if (m.find()) {
            try { return new BigDecimal(m.group(1).replace(",", ".")); }
            catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    private List<String> extractHashtags(String text) {
        if (text == null) return List.of();
        Matcher m = HASHTAG_PATTERN.matcher(text);
        List<String> tags = new ArrayList<>();
        while (m.find()) tags.add(m.group(1));
        return tags;
    }

    private String extractTitle(String text) {
        if (text == null || text.isBlank()) return "";
        for (String line : text.split("\n")) {
            String t = line.replaceAll("#\\w+", "").trim();
            if (!t.isBlank()) return t.substring(0, Math.min(255, t.length()));
        }
        return text.substring(0, Math.min(100, text.length()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private TelegramMtprotoConfig getAuthenticatedConfig(Long storeId) {
        TelegramMtprotoConfig cfg = mtprotoRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException("Keine Telegram MTProto Konfiguration. Zuerst anmelden."));
        if (!cfg.isAuthenticated() || cfg.getSessionString() == null) {
            throw new RuntimeException("Nicht angemeldet. Bitte Telegram-Account verbinden.");
        }
        return cfg;
    }

    private Long findOrCreateCategory(Store store, String name) {
        String slug = name.toLowerCase()
            .replaceAll("[äÄ]", "ae").replaceAll("[öÖ]", "oe")
            .replaceAll("[üÜ]", "ue").replaceAll("[ß]", "ss")
            .replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
        if (slug.isBlank()) return null;
        if (categoryRepository.existsByStoreIdAndSlug(store.getId(), slug)) {
            return categoryRepository.findBySlug(slug).map(c -> c.getId()).orElse(null);
        }
        Category cat = new Category();
        cat.setStore(store);
        cat.setName(name);
        cat.setSlug(slug);
        cat.setSortOrder(0);
        return categoryService.createCategory(cat).getId();
    }

    private int getLastMessageId(TelegramMtprotoConfig cfg, String channel) {
        try {
            JsonNode map = objectMapper.readTree(
                cfg.getLastMessageIds() != null ? cfg.getLastMessageIds() : "{}");
            return map.path(channel).asInt(0);
        } catch (Exception e) {
            return 0;
        }
    }

    @Transactional
    void updateLastMessageId(TelegramMtprotoConfig cfg, String channel, int msgId) {
        try {
            Map<String, Integer> map;
            if (cfg.getLastMessageIds() != null && !cfg.getLastMessageIds().equals("{}")) {
                map = objectMapper.readValue(cfg.getLastMessageIds(),
                    objectMapper.getTypeFactory().constructMapType(HashMap.class, String.class, Integer.class));
            } else {
                map = new HashMap<>();
            }
            map.put(channel, msgId);
            cfg.setLastMessageIds(objectMapper.writeValueAsString(map));
            mtprotoRepository.save(cfg);
        } catch (Exception e) {
            log.warn("[MTProto] updateLastMessageId error: {}", e.getMessage());
        }
    }

    private List<String> parseChannelList(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return List.of();
        try {
            return objectMapper.readValue(json,
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    private void saveMtprotoLog(Store store, String channelId, long msgId,
                                 Long productId, String status, String errorMsg) {
        try {
            TelegramImportLog logEntry = new TelegramImportLog();
            logEntry.setStore(store);
            logEntry.setChannelId(channelId);
            logEntry.setTelegramMsgId(msgId);
            logEntry.setProductId(productId);
            logEntry.setStatus(status);
            logEntry.setErrorMessage(errorMsg);
            importLogRepository.save(logEntry);
        } catch (Exception e) {
            // Duplikat-Constraint ignorieren
        }
    }
}

