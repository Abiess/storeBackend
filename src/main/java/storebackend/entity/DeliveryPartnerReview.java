package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Bewertung eines Delivery-Partners durch einen Store-Besitzer.
 * Enthält Gesamtbewertung + 4 Einzelkategorien.
 */
@Entity
@Table(name = "delivery_partner_reviews", indexes = {
    @Index(name = "idx_dpr_partner", columnList = "partner_id"),
    @Index(name = "idx_dpr_reviewer", columnList = "reviewer_user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryPartnerReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private DeliveryPartner partner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_user_id", nullable = false)
    private User reviewer;

    @Column(name = "reviewer_store_name")
    private String reviewerStoreName;

    @Column(nullable = false)
    private Integer rating; // 1-5

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(nullable = false)
    private Integer reliability = 0; // 1-5

    @Column(nullable = false)
    private Integer speed = 0; // 1-5

    @Column(nullable = false)
    private Integer communication = 0; // 1-5

    @Column(name = "price_quality", nullable = false)
    private Integer priceQuality = 0; // 1-5

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

