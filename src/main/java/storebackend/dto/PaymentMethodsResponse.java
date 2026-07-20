package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMethodsResponse {
    private PayPalConfig paypal;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayPalConfig {
        private boolean enabled;
        private boolean configured;
        private String mode;
    }
}
