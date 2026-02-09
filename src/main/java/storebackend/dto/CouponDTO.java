package storebackend.dto;

import lombok.Data;

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
}
