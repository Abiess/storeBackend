package storebackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * OrderFulfillmentEvent - Persistiert Fulfillment-Aktionen für idempotente Verarbeitung
 * 
 * KRITISCH:
 * - Verhindert doppelte Bestellmails, doppelte Bestandsänderungen, doppelte Benachrichtigungen
 * - Webhook und Frontend-Capture können beide versuchen, Order zu bestätigen
 * - Unique Constraint auf order_id + event_type
 */
@Entity
@Table(
    name = "order_fulfillment_events",
    uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "event_type"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderFulfillmentEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    
    /**
     * Event-Typ:
     * ORDER_CONFIRMED = Order wurde bestätigt und Fulfillment gestartet
     * INVENTORY_REDUCED = Bestand wurde reduziert
     * CONFIRMATION_EMAIL_SENT = Bestellbestätigung wurde versendet
     * ADMIN_NOTIFIED = Admin wurde benachrichtigt
     * TELEGRAM_SENT = Telegram-Benachrichtigung gesendet
     * WHATSAPP_SENT = WhatsApp-Benachrichtigung gesendet
     */
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;
    
    @Column(name = "triggered_by", length = 50)
    private String triggeredBy; // "FRONTEND_CAPTURE", "WEBHOOK", "MANUAL"
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
