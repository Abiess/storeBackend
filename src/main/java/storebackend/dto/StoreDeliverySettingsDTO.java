package storebackend.dto;

import lombok.Data;

/**
 * DTO for store delivery settings
 */
@Data
public class StoreDeliverySettingsDTO {
    private Long storeId;
    private Boolean pickupEnabled;
    private Boolean deliveryEnabled;
    private Boolean expressEnabled;
    private String currency;
}

