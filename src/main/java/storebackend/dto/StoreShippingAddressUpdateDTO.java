package storebackend.dto;

import lombok.Data;

/**
 * DTO for updating Store Shipping Address (DHL Absender-Adresse)
 */
@Data
public class StoreShippingAddressUpdateDTO {
    private String street;
    private String houseNumber;
    private String postalCode;
    private String city;
    private String country;  // ISO 3166-1 alpha-2: "DE", "AT", etc.
    private String email;
}
