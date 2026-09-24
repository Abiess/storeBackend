package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * PaymentTransaction Entity - Zentrale Zahlungstransaktion
 * 
 * WICHTIG:
 * - KEIN Unique Constraint auf order_id + provider (mehrere Versuche möglich)
 * - provider_order_id + provider eindeutig (externe Referenz)
 * - idempotency_key eindeutig (Retry-Schutz)
 */
@Entity
@Table(
    name = "payment_transactions",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_payment_provider_order",
            columnNames = {"provider", "provider_order_id"}
        ),
        @UniqueConstraint(
            name = "uk_payment_idempotency",
            columnNames = {"idempotency_key"}
        )
    },
    indexes = {
        @Index(name = "idx_payment_order", columnList = "order_id"),
        @Index(name = "idx_payment_store", columnList = "store_id"),
        @Index(name = "idx_payment_status", columnList = "status")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private PaymentProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PaymentStatus status = PaymentStatus.CREATED;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    /**
     * Provider-spezifische Order ID (z.B. PayPal Order ID)
     * Zusammen mit provider eindeutig
     */
    @Column(name = "provider_order_id", length = 100)
    private String providerOrderId;

    /**
     * Provider-spezifische Capture/Transaction ID (z.B. PayPal Capture ID)
     */
    @Column(name = "provider_capture_id", length = 100)
    private String providerCaptureId;

    /**
     * Idempotency Key für sichere Retries
     * Format: "create:{storeId}:{orderId}:{attempt}" oder "capture:{paymentId}:{providerOrderId}"
     */
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 255)
    private String idempotencyKey;

    /**
     * Failure Code bei Fehlschlag
     */
    @Column(name = "failure_code", length = 50)
    private String failureCode;

    /**
     * Failure Message bei Fehlschlag
     */
    @Column(name = "failure_message", columnDefinition = "TEXT")
    private String failureMessage;

    /**
     * Approval URL für Käufer (z.B. PayPal Checkout URL)
     */
    @Column(name = "approval_url", columnDefinition = "TEXT")
    private String approvalUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Zeitpunkt der erfolgreichen Zahlung
     */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /**
     * Zeitpunkt der Erstattung
     */
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

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
