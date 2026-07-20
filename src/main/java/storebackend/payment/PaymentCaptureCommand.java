package storebackend.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCaptureCommand {
    private String providerOrderId;
    private String idempotencyKey;
    private Long storeId;
}
