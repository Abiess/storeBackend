package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.LoyaltyIdentifierStatus;

import java.time.LocalDateTime;

/**
 * Loyalty Identifier (Karten-/Kundencode)
 *
 * MVP: "identifier" enthält einen manuell eingegebenen Testcode
 * (z.B. "BONUS-0001", "100001", "A82F913C").
 *
 * WICHTIG: Dieses Feld ist bewusst generisch gehalten, damit später die UID
 * einer echten NFC-Karte 1:1 denselben Platz einnehmen kann, OHNE dass
 * LoyaltyAccount, LoyaltyTransaction, LoyaltyService oder die UI angepasst
 * werden müssen. Es gibt keinerlei Kopplung an ein bestimmtes Kartenformat.
 */
@Entity
@Table(name = "loyalty_identifiers", uniqueConstraints = {
    @UniqueConstraint(name = "uq_loyalty_identifier_store_code", columnNames = {"store_id", "identifier"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyIdentifier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Denormalisiertes Store-Feld für effiziente Multi-Tenant-Lookups
     * (analog zu anderen Entities wie CustomerProfile, Order).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loyalty_account_id", nullable = false)
    private LoyaltyAccount loyaltyAccount;

    /**
     * Der eindeutige Code. Heute: manueller Testcode.
     * Später: 1:1 die UID der NFC-Karte (z.B. "04A82F913C1280").
     */
    @Column(name = "identifier", nullable = false, length = 100)
    private String identifier;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LoyaltyIdentifierStatus status = LoyaltyIdentifierStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = LoyaltyIdentifierStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
