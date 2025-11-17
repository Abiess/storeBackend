package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "coupons")
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String codeNormalized;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CouponType type;

    private Integer percentDiscount;
    private Long valueCents;
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CouponStatus status = CouponStatus.ACTIVE;

    private LocalDateTime startsAt;
    private LocalDateTime endsAt;

    private Long minSubtotalCents;

    @Enumerated(EnumType.STRING)
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
    @Column(name = "email")
    private List<String> customerEmails = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private DomainScope domainScope = DomainScope.ALL;

    @ElementCollection
    @CollectionTable(name = "coupon_domain_ids", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "domain_id")
    private List<Long> domainIds = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Combinable combinable = Combinable.ALL;

    private Integer usageLimitTotal;
    private Integer usageLimitPerCustomer;
    private Integer timesUsedTotal = 0;

    private Boolean autoApply = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (code != null) {
            codeNormalized = normalizeCode(code);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (code != null) {
            codeNormalized = normalizeCode(code);
        }
    }

    public static String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase();
    }

    public enum CouponType {
        PERCENT, FIXED, FREE_SHIPPING
    }

    public enum CouponStatus {
        ACTIVE, PAUSED, ARCHIVED
    }

    public enum AppliesTo {
        ALL, PRODUCTS, CATEGORIES, COLLECTIONS
    }

    public enum DomainScope {
        ALL, SELECTED
    }

    public enum Combinable {
        ALL, NONE, SAME_TYPE
    }
}

