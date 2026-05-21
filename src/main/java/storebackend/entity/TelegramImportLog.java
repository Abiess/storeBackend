package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Protokolliert jeden Telegram-Import-Versuch.
 * UNIQUE(store_id, channel_id, telegram_msg_id) verhindert Duplikate.
 */
@Entity
@Table(
    name = "telegram_import_log",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_telegram_import",
        columnNames = {"store_id", "channel_id", "telegram_msg_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelegramImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "channel_id", nullable = false, length = 100)
    private String channelId;

    /** Telegram-interne Nachrichten-ID – für Deduplizierung */
    @Column(name = "telegram_msg_id", nullable = false)
    private Long telegramMsgId;

    /** Erstelltes Produkt – null wenn SKIPPED oder ERROR */
    @Column(name = "product_id")
    private Long productId;

    /** SUCCESS | SKIPPED | ERROR */
    @Column(nullable = false, length = 20)
    private String status = "SUCCESS";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @PrePersist
    protected void onCreate() {
        importedAt = LocalDateTime.now();
    }
}

