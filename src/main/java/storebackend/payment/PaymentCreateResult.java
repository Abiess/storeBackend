package storebackend.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCreateResult {
    private boolean success;
    private String providerOrderId;
    private String approvalUrl;
    private String errorCode;
    private String errorMessage;
}
