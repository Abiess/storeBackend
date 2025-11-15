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
    private Long appliedCents; // discount amount in cents

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "domain_host", length = 255)
    private String domainHost;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "coupons", indexes = {
    @Index(name = "idx_coupon_store", columnList = "store_id"),
    @Index(name = "idx_coupon_code", columnList = "store_id,code_normalized")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(nullable = false, length = 100)
    private String code;

    @Column(name = "code_normalized", nullable = false, length = 100)
    private String codeNormalized; // uppercase A-Z, 2-9 only

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CouponType type;

    @Column(name = "percent_discount")
    private Integer percentDiscount; // 0-100 for PERCENT type

    @Column(name = "value_cents")
    private Long valueCents; // for FIXED type

    @Column(length = 3)
    private String currency; // ISO currency code (USD, EUR, etc.)

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @Column(name = "min_subtotal_cents")
    private Long minSubtotalCents;

    @Enumerated(EnumType.STRING)
    @Column(name = "applies_to", nullable = false, length = 20)
    private AppliesTo appliesTo = AppliesTo.ALL;

    @ElementCollection
    @CollectionTable(name = "coupon_product_ids", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "product_id")
    private List<Long> productIds = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "coupon_category_ids", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "category_id")
    private List<Long> categoryIds = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "coupon_collection_ids", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "collection_id")
    private List<Long> collectionIds = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "coupon_customer_emails", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "customer_email")
    private List<String> customerEmails = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "domain_scope", nullable = false, length = 20)
    private DomainScope domainScope = DomainScope.ALL;

    @ElementCollection
    @CollectionTable(name = "coupon_domain_ids", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "domain_id")
    private List<Long> domainIds = new ArrayList<>();

    @Column(name = "usage_limit_total")
    private Integer usageLimitTotal;

    @Column(name = "usage_limit_per_customer")
    private Integer usageLimitPerCustomer;

    @Column(name = "times_used_total", nullable = false)
    private Integer timesUsedTotal = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Combinable combinable = Combinable.NONE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CouponStatus status = CouponStatus.ACTIVE;

    @Column(name = "auto_apply", nullable = false)
    private Boolean autoApply = false;

    @Column(name = "description", length = 500)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper method to normalize code
    public void setCode(String code) {
        this.code = code;
        this.codeNormalized = normalizeCode(code);
    }

    public static String normalizeCode(String code) {
        if (code == null) return null;
        // Convert to uppercase and replace similar chars: O→0, I/L→1, S→5, etc.
        return code.toUpperCase()
            .replaceAll("[^A-Z0-9]", "")
            .replaceAll("[O]", "0")
            .replaceAll("[IL]", "1")
            .replaceAll("[S]", "5");
    }

    public enum CouponType {
        PERCENT,      // percentage discount
        FIXED,        // fixed amount off
        FREE_SHIPPING // free shipping
    }

    public enum AppliesTo {
        ALL,          // applies to entire cart
        PRODUCTS,     // specific products
        CATEGORIES,   // specific categories
        COLLECTIONS   // specific collections
    }

    public enum DomainScope {
        ALL,          // works on all domains
        SELECTED      // works only on selected domains
    }

    public enum Combinable {
        NONE,                        // cannot combine with any other coupon
        STACK_WITH_DIFFERENT_TYPES,  // can stack with different types only
        STACK_ALL                    // can stack with all coupons
    }

    public enum CouponStatus {
        ACTIVE,
        PAUSED,
        ARCHIVED
    }
}

