package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.TelegramImportLogDto;
import storebackend.dto.TelegramImportResultDto;
import storebackend.dto.TelegramMessageDto;
import storebackend.entity.*;
import storebackend.enums.ProductStatus;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Importiert Telegram-Channel-Posts als Produkte.
 *
 * Ablauf:
 * 1. Lade Channel-Posts via TelegramBotService (Polling)
 * 2. Parse Text → Preis, Hashtags, Telefonnummern, Links
 * 3. Duplikat-Check via TelegramImportLog (UNIQUE constraint)
 * 4. Erstelle Produkt via ProductService
 * 5. Lade Bilder via MediaService.uploadFromUrl()
 * 6. Erstelle Kategorien aus Hashtags via CategoryService
 * 7. Protokolliere in TelegramImportLog
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramImportService {

    private final TelegramBotService telegramBotService;
    private final TelegramStoreConfigRepository configRepository;
    private final TelegramImportLogRepository importLogRepository;
    private final StoreRepository storeRepository;
    private final ProductService productService;
    private final CategoryService categoryService;
    private final CategoryRepository categoryRepository;
    private final MediaService mediaService;
    private final MinioService minioService;
    private final ProductMediaRepository productMediaRepository;
    private final ProductRepository productRepository;

    // Regex: erkennt Preise in €, $, MAD, DH, DZD, درهم, دج, EUR, USD
    private static final Pattern PRICE_PATTERN = Pattern.compile(
        "(\\d{1,6}(?:[.,]\\d{1,3})?)\\s*(?:€|\\$|MAD|DH|DZD|درهم|دج|EUR|USD)",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    // Regex: Hashtags
    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#([\\w\\u0600-\\u06FF]+)");

    // Regex: Telefonnummern
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "(\\+?\\d[\\d\\s\\-().]{7,}\\d)"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Öffentliche API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Importiert Channel-Posts für einen Store.
     * Benötigt aktive TelegramStoreConfig mit Bot-Token + Channel-ID.
     * KEIN @Transactional auf Methoden-Ebene – jeder Post hat eigene Transaktion
     * damit ein Fehler bei Post N nicht Posts 1..N-1 zurückrollt.
     */
    public TelegramImportResultDto importFromChannel(Long storeId, User owner) {
        TelegramImportResultDto result = new TelegramImportResultDto();

        TelegramStoreConfig cfg = configRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException(
                "Keine Telegram-Konfiguration gefunden. Bitte zuerst Bot-Token und Channel-ID unter Einstellungen → Telegram eingeben."));

        if (!telegramBotService.isConfigured(cfg)) {
            throw new RuntimeException(
                "Telegram nicht konfiguriert oder deaktiviert. Bitte Bot-Token und Channel-ID prüfen.");
        }

        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store nicht gefunden"));

        int limit = Math.max(1, Math.min(cfg.getImportLimit(), 100));
        List<TelegramMessageDto> posts = telegramBotService.getChannelHistory(cfg.getChannelId(), cfg.getBotToken(), limit);

        log.info("[TelegramImport] Store={} – {} Posts geladen aus {}", storeId, posts.size(), cfg.getChannelId());

        if (posts.isEmpty()) {
            log.info("[TelegramImport] Keine neuen Posts – nichts zu importieren");
        }

        for (TelegramMessageDto post : posts) {
            processPost(post, cfg, store, owner, result);
        }

        log.info("[TelegramImport] Fertig: imported={}, skipped={}, errors={}",
            result.getImported(), result.getSkipped(), result.getErrors());
        return result;
    }

    /**
     * Gibt Import-History für einen Store zurück.
     */
    public List<TelegramImportLogDto> getImportLog(Long storeId) {
        return importLogRepository.findByStoreIdOrderByImportedAtDesc(storeId)
            .stream()
            .map(this::toLogDto)
            .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Interner Ablauf
    // ─────────────────────────────────────────────────────────────────────────

    protected void processPost(TelegramMessageDto post, TelegramStoreConfig cfg,
                              Store store, User owner, TelegramImportResultDto result) {
        Long storeId = store.getId();
        Long msgId = post.getMessageId();

        // 1. Duplikat-Check
        if (importLogRepository.existsByStoreIdAndChannelIdAndTelegramMsgId(storeId, cfg.getChannelId(), msgId)) {
            result.setSkipped(result.getSkipped() + 1);
            log.debug("[TelegramImport] Skipped duplicate msgId={}", msgId);
            return;
        }

        // 2. Text parsen
        String text = post.getText();
        if (text == null || text.isBlank()) {
            saveLog(store, cfg.getChannelId(), msgId, null, "SKIPPED", "Kein Text");
            result.setSkipped(result.getSkipped() + 1);
            return;
        }

        try {
            BigDecimal price = extractPrice(text);
            if (price == null) price = BigDecimal.ZERO;

            List<String> hashtags = extractHashtags(text);
            Long categoryId = null;
            if (!hashtags.isEmpty()) {
                categoryId = findOrCreateCategory(store, hashtags.get(0));
            }

            String title = extractTitle(text);
            String description = text.replaceAll("#\\w+", "").trim();

            CreateProductRequest req = new CreateProductRequest();
            req.setTitle(title);
            req.setDescription(description);
            req.setBasePrice(price);
            req.setStatus(ProductStatus.DRAFT);
            req.setStock(0);
            req.setCategoryId(categoryId);

            var productDto = productService.createProduct(req, store, owner);
            Long productId = productDto.getId();

            // Bilder hochladen UND mit Produkt verknüpfen via ProductMedia
            if (post.getPhotoUrls() != null && !post.getPhotoUrls().isEmpty()) {
                Product product = productRepository.findById(productId).orElse(null);
                if (product != null) {
                    int sortOrder = 0;
                    boolean imageUrlUpdated = false;
                    for (String photoUrl : post.getPhotoUrls()) {
                        try {
                            Media media = mediaService.uploadFromUrl(store, photoUrl, title + " (Telegram)");

                            // ProductMedia-Verknüpfung erstellen
                            ProductMedia productMedia = new ProductMedia();
                            productMedia.setProduct(product);
                            productMedia.setMedia(media);
                            productMedia.setSortOrder(sortOrder);
                            productMedia.setIsPrimary(sortOrder == 0);
                            productMediaRepository.save(productMedia);

                            if (!imageUrlUpdated && (product.getImageUrl() == null || product.getImageUrl().isBlank())) {
                                product.setImageUrl(minioService.getPublicUrl("store-assets", media.getMinioObjectName()));
                                imageUrlUpdated = true;
                            }
                            sortOrder++;

                            log.info("[TelegramImport] ✅ Bild {} verknüpft mit Produkt {}", media.getId(), productId);
                        } catch (Exception imgEx) {
                            log.warn("[TelegramImport] Bild-Upload fehlgeschlagen für msgId={}: {}", msgId, imgEx.getMessage());
                        }
                    }

                    if (imageUrlUpdated) {
                        productRepository.save(product);
                    }
                }
            }

            saveLog(store, cfg.getChannelId(), msgId, productId, "SUCCESS", null);
            result.setImported(result.getImported() + 1);
            result.getImportedTitles().add(title);

            log.info("[TelegramImport] ✅ Importiert: '{}' (productId={})", title, productId);

        } catch (Exception e) {
            log.error("[TelegramImport] Fehler bei msgId={}: {}", msgId, e.getMessage());
            saveLog(store, cfg.getChannelId(), msgId, null, "ERROR", e.getMessage());
            result.setErrors(result.getErrors() + 1);
            result.getErrorMessages().add("msgId=" + msgId + ": " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parser-Methoden
    // ─────────────────────────────────────────────────────────────────────────

    BigDecimal extractPrice(String text) {
        if (text == null) return null;
        Matcher m = PRICE_PATTERN.matcher(text);
        if (m.find()) {
            String raw = m.group(1).replace(",", ".");
            try {
                return new BigDecimal(raw);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    List<String> extractHashtags(String text) {
        if (text == null) return List.of();
        Matcher m = HASHTAG_PATTERN.matcher(text);
        List<String> tags = new java.util.ArrayList<>();
        while (m.find()) tags.add(m.group(1));
        return tags;
    }

    List<String> extractPhones(String text) {
        if (text == null) return List.of();
        Matcher m = PHONE_PATTERN.matcher(text);
        List<String> phones = new java.util.ArrayList<>();
        while (m.find()) phones.add(m.group(1).trim());
        return phones;
    }

    List<String> extractLinks(String text) {
        if (text == null) return List.of();
        Pattern linkPattern = Pattern.compile("(https?://\\S+|wa\\.me/\\S+|t\\.me/\\S+)");
        Matcher m = linkPattern.matcher(text);
        List<String> links = new java.util.ArrayList<>();
        while (m.find()) links.add(m.group(1));
        return links;
    }

    private String extractTitle(String text) {
        if (text == null) return "Neues Produkt";
        // Erste nicht-leere Zeile
        for (String line : text.split("\n")) {
            String t = line.replaceAll("#\\w+", "").trim();
            if (!t.isBlank()) {
                return t.substring(0, Math.min(255, t.length()));
            }
        }
        return text.substring(0, Math.min(100, text.length()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Kategorie-Helper
    // ─────────────────────────────────────────────────────────────────────────

    private Long findOrCreateCategory(Store store, String name) {
        // Suche bestehende Kategorie via Slug
        String slug = name.toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
        boolean exists = categoryRepository.existsByStoreIdAndSlug(store.getId(), slug);
        if (exists) {
            return categoryRepository.findBySlug(slug)
                .map(Category::getId)
                .orElse(null);
        }
        // Neue Kategorie anlegen
        Category cat = new Category();
        cat.setStore(store);
        cat.setName(name);
        cat.setSlug(slug);
        cat.setSortOrder(0);
        return categoryService.createCategory(cat).getId();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Import-Log
    // ─────────────────────────────────────────────────────────────────────────

    private void saveLog(Store store, String channelId, Long msgId,
                         Long productId, String status, String errorMsg) {
        try {
            TelegramImportLog log = new TelegramImportLog();
            log.setStore(store);
            log.setChannelId(channelId);
            log.setTelegramMsgId(msgId);
            log.setProductId(productId);
            log.setStatus(status);
            log.setErrorMessage(errorMsg);
            importLogRepository.save(log);
        } catch (Exception e) {
            // Ignoriere DB-Fehler beim Logging (z.B. Duplikat-Constraint Race Condition)
        }
    }

    private TelegramImportLogDto toLogDto(TelegramImportLog e) {
        TelegramImportLogDto dto = new TelegramImportLogDto();
        dto.setId(e.getId());
        dto.setChannelId(e.getChannelId());
        dto.setTelegramMsgId(e.getTelegramMsgId());
        dto.setProductId(e.getProductId());
        dto.setStatus(e.getStatus());
        dto.setErrorMessage(e.getErrorMessage());
        dto.setImportedAt(e.getImportedAt());
        return dto;
    }
}
