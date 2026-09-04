package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Customer Credit Account (Anschreiben-Konto)
 *
 * Ein CustomerCreditAccount ist 1:1 an einen bestehenden
 * {@link LoyaltyAccount} gebunden - KEIN neues Karten-/Kundenkonzept.
 * Dieselbe Karte/derselbe {@link LoyaltyIdentifier}, die für Bonuspunkte
 * verwendet wird, dient auch für Credit-Lookups.
 *
 * Wird LAZY angelegt: erst bei der ersten Credit-Nutzung (z.B. erste
 * "Später bezahlen"-Buchung), NICHT automatisch für jeden LoyaltyAccount.
 * Existiert noch kein CustomerCreditAccount, gilt der offene Betrag als 0.
 *
 * Punkteänderungen (Loyalty) und Credit-Buchungen bleiben fachlich
 * vollständig getrennt (unterschiedliche Tabellen/Audit-Trails) - nur
 * UX-seitig erscheint Credit innerhalb derselben Loyalty-/Kartenansicht.
 *
 * Betragsänderungen erfolgen ausschließlich über {@link CreditTransaction}
 * (Audit-Trail, keine direkte Manipulation von balanceOwed ohne Buchung).
 * balanceOwed darf nie negativ werden (siehe DB-CHECK-Constraint
 * ck_credit_account_balance_non_negative).
 */
@Entity
@Table(name = "customer_credit_accounts", uniqueConstraints = {
    @UniqueConstraint(name = "uq_credit_account_loyalty_account", columnNames = {"loyalty_account_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerCreditAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Denormalisiert für effiziente Multi-Tenant-Queries (analog zu LoyaltyAccount/LoyaltyTransaction) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /**
     * 1:1-Bindung an den bestehenden LoyaltyAccount. Kein eigenes
     * Karten-/Kundenkonzept - der Kunde wird ausschließlich über den
     * LoyaltyAccount (und dessen LoyaltyIdentifier) identifiziert.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loyalty_account_id", nullable = false)
    private LoyaltyAccount loyaltyAccount;

    /** Aktueller offener Betrag. Darf nie negativ werden (CHECK-Constraint in DB). */
    @Column(name = "balance_owed", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceOwed = BigDecimal.ZERO;

    /** Optionales Kreditlimit. NULL = kein Limit. */
    @Column(name = "credit_limit", precision = 15, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (balanceOwed == null) {
            balanceOwed = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
