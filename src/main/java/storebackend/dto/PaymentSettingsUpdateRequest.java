package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentProvider;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSettingsUpdateRequest {
    
    private PaymentProvider provider;
    private Boolean enabled;
}
