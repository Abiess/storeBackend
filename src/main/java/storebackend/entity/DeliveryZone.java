package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Delivery zone configuration with postal code ranges and fees
 */
@Entity
@Table(name = "delivery_zones", indexes = {
    @Index(name = "idx_store_active", columnList = "store_id,is_active")
})
@Data
public class DeliveryZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "country", nullable = false, length = 100)
    private String country;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "postal_code_ranges", columnDefinition = "TEXT")
    private String postalCodeRanges; // JSON array: ["20000-20999","21000-21999"]

    @Column(name = "min_order_value", precision = 10, scale = 2)
    private BigDecimal minOrderValue;

    @Column(name = "fee_standard", precision = 10, scale = 2, nullable = false)
    private BigDecimal feeStandard;

    @Column(name = "fee_express", precision = 10, scale = 2)
    private BigDecimal feeExpress;

    @Column(name = "eta_standard_minutes", nullable = false)
    private Integer etaStandardMinutes;

    @Column(name = "eta_express_minutes")
    private Integer etaExpressMinutes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

