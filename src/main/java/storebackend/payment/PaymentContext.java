package storebackend.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentContext {
    private Long storeId;
    private Long orderId;
    private BigDecimal amount;
    private String currencyCode;
    private String returnUrl;
    private String cancelUrl;
    private String idempotencyKey;
    private String storeName;
    private String orderDescription;
}
