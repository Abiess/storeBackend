package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCreateResponse {
    private Long paymentId;
    private PaymentProvider provider;
    private String providerOrderId;
    private String approvalUrl;
    private PaymentStatus status;
    private String errorCode;
    private String errorMessage;
}
