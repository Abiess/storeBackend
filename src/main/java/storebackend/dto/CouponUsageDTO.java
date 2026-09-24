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

