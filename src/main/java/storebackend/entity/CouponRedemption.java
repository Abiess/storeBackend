package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "coupon_redemptions", indexes = {
    @Index(name = "idx_redemption_store", columnList = "store_id"),
    @Index(name = "idx_redemption_coupon", columnList = "coupon_id"),
    @Index(name = "idx_redemption_customer", columnList = "customer_id"),
    @Index(name = "idx_redemption_order", columnList = "order_id", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CouponRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "applied_cents", nullable = false)
    private Long appliedCents;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "domain_host", length = 255)
    private String domainHost;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

