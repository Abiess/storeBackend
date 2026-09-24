package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResponse {
    private Long paymentId;
    private PaymentProvider provider;
    private PaymentStatus status;
    private String providerOrderId;
    private String providerCaptureId;
    private BigDecimal amount;
    private String currencyCode;
}
