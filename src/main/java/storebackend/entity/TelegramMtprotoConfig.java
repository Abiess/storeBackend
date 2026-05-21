package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * MTProto-Konfiguration pro Store.
 *
 * Klare Trennung:
 *   TelegramMtprotoConfig  → MTProto (api_id + api_hash) = Channels LESEN
 *   TelegramStoreConfig    → Bot Token = Benachrichtigungen SENDEN
 *
 * session_string = Telethon StringSession (wird im Frontend NICHT angezeigt).
 * Gespeichert als plaintext (wie WhatsApp-Token). Für Produktionsumgebungen
 * optional Jasypt-Verschlüsselung empfohlen.
 */
@Entity
@Table(name = "telegram_mtproto_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelegramMtprotoConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false, unique = true)
    private Store store;

    /** Von my.telegram.org */
    @Column(name = "api_id")
    private Integer apiId;

    /** Von my.telegram.org */
    @Column(name = "api_hash", length = 255)
    private String apiHash;

    /** Telefonnummer des Telegram-Accounts (E.164, z.B. +491234567890) */
    @Column(name = "phone", length = 50)
    private String phone;

    /**
     * Telethon StringSession – persistierter Login-Token.
     * Einmal erstellt, bleibt gültig bis der User sich ausloggt.
     * NIEMALS im Frontend anzeigen!
     */
    @Column(name = "session_string", columnDefinition = "TEXT")
    private String sessionString;

    /** Session verifiziert und gültig */
    @Column(name = "is_authenticated", nullable = false)
    private boolean authenticated = false;

    /**
     * JSON-Array der Channel-Usernames/IDs die importiert werden sollen.
     * Beispiel: ["@produktkanal", "@meinshop", "-100123456789"]
     */
    @Column(name = "watched_channels", columnDefinition = "TEXT")
    private String watchedChannels = "[]";

    /**
     * Letzte importierte Message-ID pro Channel (JSON-Map).
     * { "@kanal": 1234, "@anderer": 5678 }
     * Für inkrementellen Import – nur neue Posts werden geholt.
     */
    @Column(name = "last_message_ids", columnDefinition = "TEXT")
    private String lastMessageIds = "{}";

    /** Max. Posts pro Import-Durchlauf pro Channel */
    @Column(name = "import_limit", nullable = false)
    private int importLimit = 50;

    /** Import aktiv (Polling läuft) */
    @Column(name = "is_active", nullable = false)
    private boolean active = false;

    /** Temporär: phone_code_hash für Verifizierungsflow */
    @Column(name = "pending_phone_code_hash", length = 255)
    private String pendingPhoneCodeHash;

    /**
     * Temporär: Teil-Session aus request-code Schritt.
     * MUSS für verify-code mitgegeben werden, damit Telegram denselben Client erkennt.
     * Wird nach erfolgreichem Login gelöscht.
     */
    @Column(name = "pending_auth_session", columnDefinition = "TEXT")
    private String pendingAuthSession;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

