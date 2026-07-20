package storebackend.entity;

import jakarta.persistence.*;
import lombok.*;
import storebackend.enums.PaymentProvider;

import java.time.LocalDateTime;

/**
 * Persistiert eingehende Payment-Webhook-Events für Deduplizierung und Audit-Trail
 * 
 * WICHTIG:
 * - Vollständige Payloads werden NICHT gespeichert (DSGVO, PayPal-Richtlinien)
 * - Nur technisch notwendige IDs und ein SHA-256-Hash
 * - Unique Constraint auf provider + providerEventId verhindert Doppelverarbeitung
 */
@Entity
@Table(
    name = "payment_webhook_events",
    uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_event_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentWebhookEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Payment Provider (PAYPAL, etc.)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PaymentProvider provider;
    
    /**
     * PayPal Event ID (z.B. "WH-2WR32451HC0233532-67976317FL4543714")
     * Unique pro Provider für Deduplizierung
     */
    @Column(name = "provider_event_id", nullable = false, length = 255)
    private String providerEventId;
    
    /**
     * Event Type (z.B. "PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.APPROVED")
     */
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;
    
    /**
     * Verarbeitungsstatus:
     * RECEIVED = Event empfangen, noch nicht verarbeitet
     * PROCESSING = Verarbeitung läuft
     * PROCESSED = Erfolgreich verarbeitet
     * IGNORED = Event gültig aber nicht relevant (z.B. unbekannte Order)
     * FAILED = Verarbeitung fehlgeschlagen
     */
    @Column(name = "processing_status", nullable = false, length = 50)
    private String processingStatus;
    
    /**
     * PayPal Order ID (z.B. "5O190127TN364715T")
     * Zur Zuordnung der PaymentTransaction
     */
    @Column(name = "provider_order_id", length = 255)
    private String providerOrderId;
    
    /**
     * PayPal Capture ID (z.B. "2AB12345CD678901E")
     * Zur Zuordnung der PaymentTransaction
     */
    @Column(name = "provider_capture_id", length = 255)
    private String providerCaptureId;
    
    /**
     * SHA-256 Hash des Webhook-Payloads
     * Für Audit-Trail ohne vollständigen Payload zu speichern
     */
    @Column(name = "payload_hash", length = 64)
    private String payloadHash;
    
    /**
     * Zeitpunkt des Empfangs
     */
    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;
    
    /**
     * Zeitpunkt der erfolgreichen Verarbeitung
     */
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
    
    /**
     * Fehlercode bei fehlgeschlagener Verarbeitung
     */
    @Column(name = "failure_code", length = 100)
    private String failureCode;
    
    /**
     * Fehlermeldung bei fehlgeschlagener Verarbeitung
     * WICHTIG: Keine sensiblen Daten oder vollständigen Payloads
     */
    @Column(name = "failure_message", length = 500)
    private String failureMessage;
    
    /**
     * Referenz zur verknüpften PaymentTransaction (optional)
     * Kann NULL sein, wenn Event keiner Transaktion zugeordnet werden konnte
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;
    
    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
        if (processingStatus == null) {
            processingStatus = "RECEIVED";
        }
    }
}
