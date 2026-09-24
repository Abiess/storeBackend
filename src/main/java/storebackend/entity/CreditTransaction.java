package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.CreditTransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Credit Transaction (Anschreiben-Buchung)
 *
 * Jede Änderung von {@link CustomerCreditAccount#getBalanceOwed()} MUSS
 * als CreditTransaction gespeichert werden (Audit-Trail, analog zu
 * {@link LoyaltyTransaction}/LoyaltyAccount.pointsBalance - keine "stille"
 * Manipulation von balanceOwed).
 *
 * Referenziert wo möglich die bestehende Order (kein eigenes Checkout-
 * /Order-Konzept für Credit). Eine Order darf höchstens eine CHARGE-Zeile
 * haben (siehe DB-Constraint idx_credit_tx_unique_charge_per_order in
 * V023__create_customer_credit_tables.sql).
 */
@Entity
@Table(name = "credit_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_account_id", nullable = false)
    private CustomerCreditAccount creditAccount;

    /** Denormalisiert für Multi-Tenant-Queries (analog zu LoyaltyTransaction.store) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** Bestehende Order-Referenz, falls die Buchung aus einem Kauf stammt (POS/Online) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private CreditTransactionType type;

    /** Betragsänderung dieser Buchung (Vorzeichen-Konvention folgt in der Service-Schicht) */
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** Offener Betrag NACH dieser Buchung (Snapshot, erleichtert Historie/Debugging) */
    @Column(name = "resulting_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal resultingBalance;

    /** Optionale Notiz (z.B. Grund bei ADJUSTMENT/REVERSAL) */
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
