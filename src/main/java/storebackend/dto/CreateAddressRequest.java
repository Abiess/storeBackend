package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AddressType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAddressRequest {
    private AddressType addressType;
    private String firstName;
    private String lastName;
    private String company;
    private String address1;
    private String address2;
    private String city;
    private String stateProvince;
    private String postalCode;
    private String country;
    private String phone;
    private Boolean isDefault;
}

