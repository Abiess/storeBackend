package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentProvider;

import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCreateRequest {
    
    @NotNull(message = "Order ID is required")
    private Long orderId;
    
    @NotNull(message = "Payment provider is required")
    private PaymentProvider provider;
    
    private String returnUrl;
    private String cancelUrl;
    
    private String checkoutToken;
}
