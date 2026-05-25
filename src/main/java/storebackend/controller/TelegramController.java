package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.TelegramConfigDto;
import storebackend.dto.TelegramImportLogDto;
import storebackend.dto.TelegramImportResultDto;
import storebackend.entity.Store;
import storebackend.entity.TelegramStoreConfig;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.TelegramStoreConfigRepository;
import storebackend.service.TelegramBotService;
import storebackend.service.TelegramImportService;

import java.util.List;
import java.util.Map;

/**
 * REST-Controller für Telegram Bot Konfiguration und Channel-Import.
 *
 * Alle Endpunkte: /api/stores/{storeId}/telegram/...
 * Erfordert Authentifizierung (JWT) und Store-Ownership.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/telegram")
@RequiredArgsConstructor
public class TelegramController {

    private final TelegramStoreConfigRepository configRepository;
    private final TelegramBotService telegramBotService;
    private final TelegramImportService telegramImportService;
    private final StoreRepository storeRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Konfiguration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/stores/{storeId}/telegram/config
     * Lädt die Telegram-Konfiguration (Bot-Token gemaskiert).
     */
    @GetMapping("/config")
    public ResponseEntity<TelegramConfigDto> getConfig(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        TelegramStoreConfig cfg = configRepository.findByStoreId(storeId)
            .orElse(null);

        if (cfg == null) {
            // Leere Config zurückgeben (kein 404)
            TelegramConfigDto empty = new TelegramConfigDto();
            empty.setStoreId(storeId);
            return ResponseEntity.ok(empty);
        }

        return ResponseEntity.ok(toDto(cfg, true));
    }

    /**
     * PUT /api/stores/{storeId}/telegram/config
     * Speichert / aktualisiert die Telegram-Konfiguration.
     */
    @PutMapping("/config")
    public ResponseEntity<TelegramConfigDto> saveConfig(
            @PathVariable Long storeId,
            @RequestBody TelegramConfigDto request,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        TelegramStoreConfig cfg = configRepository.findByStoreId(storeId)
            .orElseGet(() -> {
                TelegramStoreConfig newCfg = new TelegramStoreConfig();
                newCfg.setStore(store);
                return newCfg;
            });

        // Bot-Token: leer oder "****" → bestehenden Token behalten
        if (request.getBotToken() != null
                && !request.getBotToken().isBlank()
                && !request.getBotToken().startsWith("****")) {
            cfg.setBotToken(request.getBotToken());
        }

        if (request.getChannelId() != null) cfg.setChannelId(request.getChannelId());
        cfg.setNotifyNewOrders(request.isNotifyNewOrders());
        cfg.setNotifyLowStock(request.isNotifyLowStock());
        cfg.setPostNewProducts(request.isPostNewProducts());
        cfg.setLowStockThreshold(Math.max(1, request.getLowStockThreshold()));
        cfg.setImportLimit(Math.min(100, Math.max(1, request.getImportLimit())));
        cfg.setActive(request.isActive());

        cfg = configRepository.save(cfg);
        return ResponseEntity.ok(toDto(cfg, true));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Verbindungstest
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/stores/{storeId}/telegram/test
     * Sendet eine Test-Nachricht – prüft ob Bot + Channel erreichbar.
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testConnection(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        TelegramStoreConfig cfg = configRepository.findByStoreId(storeId)
            .orElseThrow(() -> new RuntimeException("Keine Konfiguration gefunden"));

        boolean success = telegramBotService.testConnection(cfg);
        return ResponseEntity.ok(Map.of(
            "success", success,
            "message", success
                ? "✅ Bot verbunden! Test-Nachricht wurde gesendet."
                : "❌ Verbindung fehlgeschlagen. Bitte Token und Channel-ID prüfen."
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Import
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/stores/{storeId}/telegram/import
     * Löst den Channel-Import aus (Polling der letzten Posts).
     */
    @PostMapping("/import")
    public ResponseEntity<?> triggerImport(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        try {
            TelegramImportResultDto result = telegramImportService.importFromChannel(storeId, user);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Import fehlgeschlagen";
            // Konfigurationsfehler → 422 (verständliche Fehlermeldung statt 500)
            if (msg.contains("Konfiguration") || msg.contains("konfiguriert") || msg.contains("Token")) {
                return ResponseEntity.unprocessableEntity()
                    .body(Map.of("error", "CONFIG_MISSING", "message", msg));
            }
            // Sonstige Fehler → 400 mit Fehlermeldung (kein 500)
            return ResponseEntity.badRequest()
                .body(Map.of("error", "IMPORT_FAILED", "message", msg));
        }
    }

    /**
     * GET /api/stores/{storeId}/telegram/import/log
     * Gibt die Import-Historie zurück (neueste zuerst).
     */
    @GetMapping("/import/log")
    public ResponseEntity<List<TelegramImportLogDto>> getImportLog(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        return ResponseEntity.ok(telegramImportService.getImportLog(storeId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void verifyOwnership(Long storeId, User user) {
        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN,
                "Zugriff verweigert"
            );
        }
    }

    private TelegramConfigDto toDto(TelegramStoreConfig cfg, boolean maskToken) {
        TelegramConfigDto dto = new TelegramConfigDto();
        dto.setId(cfg.getId());
        dto.setStoreId(cfg.getStore().getId());

        // Token maskieren: "****abcd" (letzte 4 Zeichen)
        if (cfg.getBotToken() != null && !cfg.getBotToken().isBlank()) {
            if (maskToken && cfg.getBotToken().length() > 4) {
                dto.setBotToken("****" + cfg.getBotToken().substring(cfg.getBotToken().length() - 4));
            } else {
                dto.setBotToken(cfg.getBotToken());
            }
        }

        dto.setChannelId(cfg.getChannelId());
        dto.setNotifyNewOrders(cfg.isNotifyNewOrders());
        dto.setNotifyLowStock(cfg.isNotifyLowStock());
        dto.setPostNewProducts(cfg.isPostNewProducts());
        dto.setLowStockThreshold(cfg.getLowStockThreshold());
        dto.setImportLimit(cfg.getImportLimit());
        dto.setActive(cfg.isActive());
        dto.setConnected(telegramBotService.isConfigured(cfg));
        return dto;
    }
}

