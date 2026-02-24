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

    // Explicit getters (Lombok fallback)
    public Boolean getPickupEnabled() {
        return pickupEnabled;
    }

    public Boolean getDeliveryEnabled() {
        return deliveryEnabled;
    }

    public Boolean getExpressEnabled() {
        return expressEnabled;
    }

    public String getCurrency() {
        return currency;
    }
}
