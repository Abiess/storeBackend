package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartTotalsDTO {
    private Long subtotalCents;
    private Long discountCents;
    private Long shippingCents;
    private Long taxCents;
    private Long totalCents;
    private String currency;
}

