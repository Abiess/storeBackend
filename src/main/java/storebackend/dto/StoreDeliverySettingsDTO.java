package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for store delivery settings
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreDeliverySettingsDTO {
    private Long storeId;
    private Boolean pickupEnabled;
    private Boolean deliveryEnabled;
    private Boolean expressEnabled;
    private String currency;
}
