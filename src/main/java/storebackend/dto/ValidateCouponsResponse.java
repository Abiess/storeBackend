package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidateCouponsResponse {
    private List<ValidCouponDTO> validCoupons = new ArrayList<>();
    private List<InvalidCouponDTO> invalidCoupons = new ArrayList<>();
    private CartTotalsDTO cartTotals;
}

