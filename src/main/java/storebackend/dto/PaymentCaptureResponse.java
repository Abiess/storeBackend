package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCaptureResponse {
    private boolean success;
    private PaymentStatus status;
    private String providerCaptureId;
    private String errorCode;
    private String errorMessage;
}
