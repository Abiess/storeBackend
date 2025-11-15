package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidCouponDTO {
    private Long couponId;
    private String code;
    private String type;
    private Long discountCents;
    private String message;
}

