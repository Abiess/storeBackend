package storebackend.dto;

import lombok.Data;
import storebackend.entity.Coupon;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class CouponDTO {
    private Long id;
    private Long storeId;
    private String code;
    private String type;
    private Integer percentDiscount;
    private Long valueCents;
    private String currency;
    private String status;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Long minSubtotalCents;
    private String appliesTo;
    private List<Long> productIds = new ArrayList<>();
    private List<Long> categoryIds = new ArrayList<>();
    private List<Long> collectionIds = new ArrayList<>();
    private List<String> customerEmails = new ArrayList<>();
    private String domainScope;
    private List<Long> domainIds = new ArrayList<>();
    private String combinable;
    private Integer usageLimitTotal;
    private Integer usageLimitPerCustomer;
    private Integer timesUsedTotal;
    private Boolean autoApply;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CouponDTO fromEntity(Coupon coupon) {
        CouponDTO dto = new CouponDTO();
        dto.setId(coupon.getId());
        dto.setStoreId(coupon.getStoreId());
        dto.setCode(coupon.getCode());
        dto.setType(coupon.getType().name());
        dto.setPercentDiscount(coupon.getPercentDiscount());
        dto.setValueCents(coupon.getValueCents());
        dto.setCurrency(coupon.getCurrency());
        dto.setStatus(coupon.getStatus().name());
        dto.setStartsAt(coupon.getStartsAt());
        dto.setEndsAt(coupon.getEndsAt());
        dto.setMinSubtotalCents(coupon.getMinSubtotalCents());
        dto.setAppliesTo(coupon.getAppliesTo().name());
        dto.setProductIds(coupon.getProductIds());
        dto.setCategoryIds(coupon.getCategoryIds());
        dto.setCollectionIds(coupon.getCollectionIds());
        dto.setCustomerEmails(coupon.getCustomerEmails());
        dto.setDomainScope(coupon.getDomainScope().name());
        dto.setDomainIds(coupon.getDomainIds());
        dto.setCombinable(coupon.getCombinable().name());
        dto.setUsageLimitTotal(coupon.getUsageLimitTotal());
        dto.setUsageLimitPerCustomer(coupon.getUsageLimitPerCustomer());
        dto.setTimesUsedTotal(coupon.getTimesUsedTotal());
        dto.setAutoApply(coupon.getAutoApply());
        dto.setCreatedAt(coupon.getCreatedAt());
        dto.setUpdatedAt(coupon.getUpdatedAt());
        return dto;
    }

    public Coupon toEntity() {
        Coupon coupon = new Coupon();
        coupon.setId(this.id);
        coupon.setStoreId(this.storeId);
        coupon.setCode(this.code);
        coupon.setType(Coupon.CouponType.valueOf(this.type));
        coupon.setPercentDiscount(this.percentDiscount);
        coupon.setValueCents(this.valueCents);
        coupon.setCurrency(this.currency);
        coupon.setStatus(Coupon.CouponStatus.valueOf(this.status));
        coupon.setStartsAt(this.startsAt);
        coupon.setEndsAt(this.endsAt);
        coupon.setMinSubtotalCents(this.minSubtotalCents);
        coupon.setAppliesTo(Coupon.AppliesTo.valueOf(this.appliesTo));
        coupon.setProductIds(this.productIds != null ? this.productIds : new ArrayList<>());
        coupon.setCategoryIds(this.categoryIds != null ? this.categoryIds : new ArrayList<>());
        coupon.setCollectionIds(this.collectionIds != null ? this.collectionIds : new ArrayList<>());
        coupon.setCustomerEmails(this.customerEmails != null ? this.customerEmails : new ArrayList<>());
        coupon.setDomainScope(Coupon.DomainScope.valueOf(this.domainScope));
        coupon.setDomainIds(this.domainIds != null ? this.domainIds : new ArrayList<>());
        coupon.setCombinable(Coupon.Combinable.valueOf(this.combinable));
        coupon.setUsageLimitTotal(this.usageLimitTotal);
        coupon.setUsageLimitPerCustomer(this.usageLimitPerCustomer);
        coupon.setTimesUsedTotal(this.timesUsedTotal);
        coupon.setAutoApply(this.autoApply);
        return coupon;
    }
}
