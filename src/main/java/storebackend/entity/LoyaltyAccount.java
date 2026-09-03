package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Loyalty Account (Bonuspunkte-Konto)
 *
 * MVP: Ein LoyaltyAccount gehört zu genau einem Store und ist mit einem
 * bestehenden CustomerProfile verknüpft (kein neues Customer-Konzept!).
 *
 * Die Karte selbst speichert KEINE Punkte - sie identifiziert nur den
 * Account (siehe {@link LoyaltyIdentifier}). Der Punktestand lebt hier.
 *
 * Punkteänderungen erfolgen ausschließlich über {@link LoyaltyTransaction}
 * (Audit-Trail, keine direkte Manipulation von pointsBalance ohne Buchung).
 */
@Entity
@Table(name = "loyalty_accounts", uniqueConstraints = {
    @UniqueConstraint(name = "uq_loyalty_account_store_customer", columnNames = {"store_id", "customer_profile_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** Bestehendes Kunden-Profil (store-spezifisch) - kein neues Customer-Entity */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_profile_id", nullable = false)
    private CustomerProfile customerProfile;

    /** Aktueller Punktestand (kann durch REDEEM/ADJUST auch sinken) */
    @Column(name = "points_balance", nullable = false)
    private Integer pointsBalance = 0;

    /** Summe aller jemals gutgeschriebenen Punkte (nur EARN, für Statistik/Level-Systeme) */
    @Column(name = "lifetime_points", nullable = false)
    private Integer lifetimePoints = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (pointsBalance == null) {
            pointsBalance = 0;
        }
        if (lifetimePoints == null) {
            lifetimePoints = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
