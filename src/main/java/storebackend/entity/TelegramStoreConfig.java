package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Telegram Bot Konfiguration pro Store.
 * Speichert BotFather-Token + Channel-ID sowie Notification-Flags.
 * Bot muss als Admin im Channel eingetragen sein.
 */
@Entity
@Table(name = "telegram_store_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelegramStoreConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false, unique = true)
    private Store store;

    /** BotFather-Token (z.B. 123456:ABCdef...) – plaintext wie WhatsApp-Token */
    @Column(name = "bot_token", length = 500)
    private String botToken;

    /** Channel-ID: @username ODER numerische ID z.B. -100123456789 */
    @Column(name = "channel_id", length = 100)
    private String channelId;

    /** Neue Bestellung → Telegram-Nachricht an Store-Owner */
    @Column(name = "notify_new_orders", nullable = false)
    private boolean notifyNewOrders = true;

    /** Niedriger Lagerbestand → Alert */
    @Column(name = "notify_low_stock", nullable = false)
    private boolean notifyLowStock = false;

    /** Neues Produkt → automatisch in Channel posten */
    @Column(name = "post_new_products", nullable = false)
    private boolean postNewProducts = false;

    /** Ab welchem Lagerstand "Low Stock" gilt */
    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold = 5;

    /** Max. Posts pro Import-Durchlauf */
    @Column(name = "import_limit", nullable = false)
    private int importLimit = 50;

    @Column(name = "is_active", nullable = false)
    private boolean active = false;

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

