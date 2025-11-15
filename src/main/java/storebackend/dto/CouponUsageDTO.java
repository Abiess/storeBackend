package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CouponUsageDTO {
    private Long totalRedemptions;
    private Long totalDiscountCents;
    private String currency;
    private Integer timesUsedTotal;
}
package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.Coupon;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CouponDTO {
    private Long id;
    private Long storeId;
    private String code;
    private CouponType type;
    private Integer percentDiscount;
    private Long valueCents;
    private String currency;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Long minSubtotalCents;
    private AppliesTo appliesTo;
    private List<Long> productIds = new ArrayList<>();
    private List<Long> categoryIds = new ArrayList<>();
    private List<Long> collectionIds = new ArrayList<>();
    private List<String> customerEmails = new ArrayList<>();
    private DomainScope domainScope;
    private List<Long> domainIds = new ArrayList<>();
    private Integer usageLimitTotal;
    private Integer usageLimitPerCustomer;
    private Integer timesUsedTotal;
    private Combinable combinable;
    private CouponStatus status;
    private Boolean autoApply;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum CouponType { PERCENT, FIXED, FREE_SHIPPING }
    public enum AppliesTo { ALL, PRODUCTS, CATEGORIES, COLLECTIONS }
    public enum DomainScope { ALL, SELECTED }
    public enum Combinable { NONE, STACK_WITH_DIFFERENT_TYPES, STACK_ALL }
    public enum CouponStatus { ACTIVE, PAUSED, ARCHIVED }

    public static CouponDTO fromEntity(Coupon coupon) {
        CouponDTO dto = new CouponDTO();
        dto.setId(coupon.getId());
        dto.setStoreId(coupon.getStoreId());
        dto.setCode(coupon.getCode());
        dto.setType(CouponType.valueOf(coupon.getType().name()));
        dto.setPercentDiscount(coupon.getPercentDiscount());
        dto.setValueCents(coupon.getValueCents());
        dto.setCurrency(coupon.getCurrency());
        dto.setStartsAt(coupon.getStartsAt());
        dto.setEndsAt(coupon.getEndsAt());
        dto.setMinSubtotalCents(coupon.getMinSubtotalCents());
        dto.setAppliesTo(AppliesTo.valueOf(coupon.getAppliesTo().name()));
        dto.setProductIds(coupon.getProductIds());
        dto.setCategoryIds(coupon.getCategoryIds());
        dto.setCollectionIds(coupon.getCollectionIds());
        dto.setCustomerEmails(coupon.getCustomerEmails());
        dto.setDomainScope(DomainScope.valueOf(coupon.getDomainScope().name()));
        dto.setDomainIds(coupon.getDomainIds());
        dto.setUsageLimitTotal(coupon.getUsageLimitTotal());
        dto.setUsageLimitPerCustomer(coupon.getUsageLimitPerCustomer());
        dto.setTimesUsedTotal(coupon.getTimesUsedTotal());
        dto.setCombinable(Combinable.valueOf(coupon.getCombinable().name()));
        dto.setStatus(CouponStatus.valueOf(coupon.getStatus().name()));
        dto.setAutoApply(coupon.getAutoApply());
        dto.setDescription(coupon.getDescription());
        dto.setCreatedAt(coupon.getCreatedAt());
        dto.setUpdatedAt(coupon.getUpdatedAt());
        return dto;
    }

    public Coupon toEntity() {
        Coupon coupon = new Coupon();
        coupon.setId(this.id);
        coupon.setStoreId(this.storeId);
        coupon.setCode(this.code);
        coupon.setType(Coupon.CouponType.valueOf(this.type.name()));
        coupon.setPercentDiscount(this.percentDiscount);
        coupon.setValueCents(this.valueCents);
        coupon.setCurrency(this.currency);
        coupon.setStartsAt(this.startsAt);
        coupon.setEndsAt(this.endsAt);
        coupon.setMinSubtotalCents(this.minSubtotalCents);
        coupon.setAppliesTo(Coupon.AppliesTo.valueOf(this.appliesTo.name()));
        coupon.setProductIds(this.productIds);
        coupon.setCategoryIds(this.categoryIds);
        coupon.setCollectionIds(this.collectionIds);
        coupon.setCustomerEmails(this.customerEmails);
        coupon.setDomainScope(Coupon.DomainScope.valueOf(this.domainScope.name()));
        coupon.setDomainIds(this.domainIds);
        coupon.setUsageLimitTotal(this.usageLimitTotal);
        coupon.setUsageLimitPerCustomer(this.usageLimitPerCustomer);
        coupon.setTimesUsedTotal(this.timesUsedTotal != null ? this.timesUsedTotal : 0);
        coupon.setCombinable(Coupon.Combinable.valueOf(this.combinable.name()));
        coupon.setStatus(Coupon.CouponStatus.valueOf(this.status.name()));
        coupon.setAutoApply(this.autoApply != null ? this.autoApply : false);
        coupon.setDescription(this.description);
        return coupon;
    }
}

