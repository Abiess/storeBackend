package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.LoyaltyTransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Loyalty Transaction (Punkte-Buchung)
 *
 * Jede Änderung des Punktestandes eines LoyaltyAccount MUSS als
 * LoyaltyTransaction gespeichert werden (Audit-Trail, keine "stille"
 * Manipulation von LoyaltyAccount.pointsBalance).
 *
 * Referenziert wo möglich die bestehende Order (kein eigenes Checkout-
 * /Order-Konzept für Loyalty).
 */
@Entity
@Table(name = "loyalty_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loyalty_account_id", nullable = false)
    private LoyaltyAccount loyaltyAccount;

    /** Denormalisiert für Multi-Tenant-Queries (analog zu anderen Entities) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** Bestehende Order-Referenz, falls die Buchung aus einem Kauf stammt (POS/Online) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private LoyaltyTransactionType type;

    /** Punkteänderung (positiv bei EARN, negativ bei REDEEM, +/- bei ADJUST) */
    @Column(name = "points", nullable = false)
    private Integer points;

    /** Einkaufswert, der der Punktevergabe zugrunde lag (nullable bei ADJUST ohne Kauf) */
    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    /** Punktestand NACH dieser Buchung (Snapshot, erleichtert Historie/Debugging) */
    @Column(name = "resulting_balance", nullable = false)
    private Integer resultingBalance;

    /** Optionale Notiz (z.B. Grund bei ADJUST) */
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
