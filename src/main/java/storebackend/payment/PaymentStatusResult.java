package storebackend.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResult {
    private boolean success;
    private PaymentStatus status;
    private String providerOrderId;
    private String providerCaptureId;
    private String errorCode;
    private String errorMessage;
}
