package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Benachrichtigung über Telegram-Sync-Ereignisse pro Store.
 *
 * Typen:
 *   NEW_PRODUCTS    – X neue Produkte importiert
 *   IMPORT_ERROR    – Import-Fehler in einem Channel
 *   PRICE_MISSING   – Produkte ohne erkannten Preis (basePrice=1)
 *   IMAGE_MISSING   – Produkte ohne Bild importiert
 *   DUPLICATE       – Duplikat-Posts übersprungen
 */
@Entity
@Table(name = "telegram_sync_notifications",
    indexes = { @Index(name = "idx_tsn_store_read", columnList = "store_id, is_read") })
@Data
@NoArgsConstructor
public class TelegramSyncNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** Notification-Typ */
    @Column(name = "type", nullable = false, length = 30)
    private String type; // NEW_PRODUCTS | IMPORT_ERROR | PRICE_MISSING | IMAGE_MISSING | DUPLICATE

    /** Benutzerfreundliche Nachricht, z.B. "3 neue Telegram-Produkte gefunden" */
    @Column(name = "message", nullable = false, length = 500)
    private String message;

    /** Anzahl der betroffenen Produkte/Posts */
    @Column(name = "count", nullable = false)
    private int count = 0;

    /** Channel aus dem die Notification stammt */
    @Column(name = "channel", length = 255)
    private String channel;

    /** Bereits gelesen/dismiss */
    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public TelegramSyncNotification(Long storeId, String type, String message, int count, String channel) {
        this.storeId = storeId;
        this.type = type;
        this.message = message;
        this.count = count;
        this.channel = channel;
    }
}

