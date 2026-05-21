package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.TelegramImportResultDto;
import storebackend.entity.TelegramMtprotoConfig;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.TelegramMtprotoConfigRepository;
import storebackend.service.TelegramMtprotoService;

import java.util.List;
import java.util.Map;

/**
 * REST-Endpoints für den Telegram MTProto Channel Importer.
 *
 * Klare Trennung:
 *   /api/stores/{storeId}/telegram/mtproto/...  → MTProto (Lesen, dieses Feature)
 *   /api/stores/{storeId}/telegram/...          → Bot Token (Benachrichtigungen)
 *
 * Auth-Flow:
 *   1. POST /mtproto/auth/request-code  → Code ans Telefon
 *   2. POST /mtproto/auth/verify-code   → Session erstellen
 *   3. GET  /mtproto/auth/status        → Session prüfen
 *   DELETE /mtproto/auth/session        → Logout
 *
 * Channel-Verwaltung:
 *   GET  /mtproto/channels              → Abonnierte Channels auflisten
 *   PUT  /mtproto/channels/watched      → Zu importierende Channels setzen
 *
 * Import:
 *   POST /mtproto/import/{channel}      → Einzelnen Channel importieren
 *   POST /mtproto/import/all            → Alle überwachten Channels importieren
 *
 * Konfiguration:
 *   GET  /mtproto/config                → Konfiguration laden (Session NICHT zurückgegeben)
 *   PUT  /mtproto/config                → Import-Limit, aktiv/inaktiv etc.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/telegram/mtproto")
@RequiredArgsConstructor
public class TelegramMtprotoController {

    private final TelegramMtprotoService mtprotoService;
    private final TelegramMtprotoConfigRepository configRepository;
    private final StoreRepository storeRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Auth-Flow
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Schritt 1: Sendet Verifizierungscode an Telefon.
     * Body: { apiId, apiHash, phone }
     */
    @PostMapping("/auth/request-code")
    public ResponseEntity<Map<String, Object>> requestCode(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        Integer apiId = (Integer) body.get("apiId");
        String apiHash = (String) body.get("apiHash");
        String phone   = (String) body.get("phone");

        if (apiId == null || apiHash == null || phone == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "apiId, apiHash und phone sind erforderlich"));
        }

        try {
            String phoneCodeHash = mtprotoService.requestAuthCode(storeId, apiId, apiHash, phone);
            return ResponseEntity.ok(Map.of(
                "phoneCodeHash", phoneCodeHash,
                "message", "Code an " + phone + " gesendet"
            ));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Fehler beim Senden des Codes";
            if (msg.contains("429") || msg.toLowerCase().contains("flood") || msg.toLowerCase().contains("warte")) {
                return ResponseEntity.status(429).body(Map.of("error", "RATE_LIMIT", "message", msg));
            }
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
    }

    /**
     * Schritt 2: Code verifizieren → Session erstellen.
     * Body: { code, password (optional für 2FA) }
     */
    @PostMapping("/auth/verify-code")
    public ResponseEntity<Map<String, Object>> verifyCode(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        String code     = (String) body.get("code");
        String password = (String) body.get("password");

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "code ist erforderlich"));
        }

        try {
            TelegramMtprotoConfig cfg = mtprotoService.verifyAuthCode(storeId, code, password);
            return ResponseEntity.ok(Map.of(
                "authenticated", cfg.isAuthenticated(),
                "phone", cfg.getPhone() != null ? cfg.getPhone() : "",
                "message", "Telegram-Account erfolgreich verbunden!"
            ));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Unbekannter Fehler";
            // Code abgelaufen → 410 Gone mit Hinweis, neuen Code anzufordern
            if (msg.toLowerCase().contains("abgelaufen") || msg.toLowerCase().contains("expired")) {
                return ResponseEntity.status(410).body(Map.of(
                    "error", "CODE_EXPIRED",
                    "message", "Der Bestätigungscode ist abgelaufen. Bitte fordere einen neuen Code an.",
                    "action", "REQUEST_NEW_CODE"
                ));
            }
            // Falscher Code → 400
            if (msg.toLowerCase().contains("falscher") || msg.toLowerCase().contains("invalid")) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "CODE_INVALID",
                    "message", msg
                ));
            }
            // 2FA → 401
            if (msg.toLowerCase().contains("2fa") || msg.toLowerCase().contains("passwort")) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "TWO_FA_REQUIRED",
                    "message", msg
                ));
            }
            // Sonstige Fehler → 400 (kein 500!)
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
    }

    /**
     * Session-Status prüfen.
     */
    @GetMapping("/auth/status")
    public ResponseEntity<Map<String, Object>> authStatus(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        TelegramMtprotoConfig cfg = configRepository.findByStoreId(storeId).orElse(null);
        boolean hasConfig = cfg != null;
        boolean authenticated = hasConfig && cfg.isAuthenticated();
        boolean sessionValid = false;

        if (authenticated) {
            sessionValid = mtprotoService.checkSession(storeId);
        }

        return ResponseEntity.ok(Map.of(
            "hasConfig", hasConfig,
            "authenticated", authenticated,
            "sessionValid", sessionValid,
            "phone", cfg != null && cfg.getPhone() != null ? cfg.getPhone() : "",
            "watchedChannels", cfg != null && cfg.getWatchedChannels() != null
                ? cfg.getWatchedChannels() : "[]",
            "importLimit", cfg != null ? cfg.getImportLimit() : 50,
            "active", cfg != null && cfg.isActive()
        ));
    }

    /**
     * Logout – Session invalidieren.
     */
    @DeleteMapping("/auth/session")
    public ResponseEntity<Map<String, Object>> logout(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);
        mtprotoService.logout(storeId);
        return ResponseEntity.ok(Map.of("message", "Erfolgreich abgemeldet"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Channel-Verwaltung
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Listet alle abonnierten Channels des Telegram-Accounts.
     */
    @GetMapping("/channels")
    public ResponseEntity<Object> listChannels(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);
        return ResponseEntity.ok(mtprotoService.listChannels(storeId));
    }

    /**
     * Setzt die Channels die überwacht/importiert werden sollen.
     * Body: { channels: ["@kanal1", "@kanal2"] }
     */
    @PutMapping("/channels/watched")
    public ResponseEntity<Map<String, Object>> updateWatchedChannels(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        @SuppressWarnings("unchecked")
        List<String> channels = (List<String>) body.get("channels");
        if (channels == null) channels = List.of();

        TelegramMtprotoConfig cfg = mtprotoService.updateWatchedChannels(storeId, channels);
        return ResponseEntity.ok(Map.of(
            "watchedChannels", cfg.getWatchedChannels(),
            "message", channels.size() + " Channels gespeichert"
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Import
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Importiert Posts aus einem einzelnen Channel.
     * Body: { channel: "@username" }
     */
    @PostMapping("/import")
    public ResponseEntity<TelegramImportResultDto> importChannel(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        String channel = (String) body.get("channel");
        if (channel == null || channel.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "channel ist erforderlich");
        }

        TelegramImportResultDto result = mtprotoService.importChannel(storeId, channel, user);
        return ResponseEntity.ok(result);
    }

    /**
     * Importiert aus allen konfigurierten überwachten Channels.
     */
    @PostMapping("/import/all")
    public ResponseEntity<Map<String, TelegramImportResultDto>> importAll(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);
        Map<String, TelegramImportResultDto> results =
            mtprotoService.importAllWatchedChannels(storeId, user);
        return ResponseEntity.ok(results);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Konfiguration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Konfiguration laden (OHNE session_string und api_hash).
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        TelegramMtprotoConfig cfg = configRepository.findByStoreId(storeId).orElse(null);
        if (cfg == null) {
            return ResponseEntity.ok(Map.of("configured", false));
        }

        return ResponseEntity.ok(Map.of(
            "configured", true,
            "authenticated", cfg.isAuthenticated(),
            "phone", cfg.getPhone() != null ? cfg.getPhone() : "",
            "apiId", cfg.getApiId() != null ? cfg.getApiId() : 0,
            // api_hash und session_string werden NICHT zurückgegeben
            "watchedChannels", cfg.getWatchedChannels() != null ? cfg.getWatchedChannels() : "[]",
            "importLimit", cfg.getImportLimit(),
            "active", cfg.isActive()
        ));
    }

    /**
     * Import-Einstellungen ändern (Limit, aktiv/inaktiv).
     * Body: { importLimit, active }
     */
    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @PathVariable Long storeId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User user) {

        verifyOwnership(storeId, user);

        TelegramMtprotoConfig cfg = configRepository.findByStoreId(storeId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Keine Konfiguration"));

        if (body.containsKey("importLimit")) {
            int limit = Math.min(100, Math.max(1, (Integer) body.get("importLimit")));
            cfg.setImportLimit(limit);
        }
        if (body.containsKey("active")) {
            cfg.setActive((Boolean) body.get("active"));
        }
        configRepository.save(cfg);

        return ResponseEntity.ok(Map.of("message", "Gespeichert", "active", cfg.isActive()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────────

    private void verifyOwnership(Long storeId, User user) {
        if (!storeRepository.isStoreOwnedByUser(storeId, user.getId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Zugriff verweigert");
        }
    }
}

