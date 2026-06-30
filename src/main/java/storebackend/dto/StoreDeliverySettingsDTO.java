package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for store delivery settings
 * Inkludiert DHL Integration Settings
 * 
 * SECURITY: Secrets (dhlClientSecret, dhlPassword) werden masked zurückgegeben
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
    
    // ════════════════════════════════════════════════════════════
    // DHL INTEGRATION SETTINGS
    // ════════════════════════════════════════════════════════════
    
    private Boolean dhlEnabled;
    private String dhlEnvironment; // SANDBOX | PRODUCTION
    
    // Credentials (masked in Response)
    private String dhlClientId;
    private String dhlClientSecret; // ⚠️ Masked as "********" in GET Response
    private String dhlUsername;
    private String dhlPassword; // ⚠️ Masked as "********" in GET Response
    private String dhlBillingNumber;
    
    // Shipper Address
    private String dhlShipperName;
    private String dhlShipperStreet;
    private String dhlShipperHouseNumber;
    private String dhlShipperPostalCode;
    private String dhlShipperCity;
    private String dhlShipperCountry;
    private String dhlShipperEmail;
    private String dhlShipperPhone;
    
    // Default Package Dimensions
    private Integer dhlDefaultWeightGrams;
    private Integer dhlDefaultLengthMm;
    private Integer dhlDefaultWidthMm;
    private Integer dhlDefaultHeightMm;

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
    
    public Boolean getDhlEnabled() {
        return dhlEnabled;
    }
}
