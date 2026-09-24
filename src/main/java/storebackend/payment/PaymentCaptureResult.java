package storebackend.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentStatus;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCaptureResult {
    private boolean success;
    private String providerCaptureId;
    private PaymentStatus status;
    private BigDecimal capturedAmount;
    private String currencyCode;
    private String errorCode;
    private String errorMessage;
}
