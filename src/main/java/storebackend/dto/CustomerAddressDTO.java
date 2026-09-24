package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.AddressType;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAddressDTO {
    private Long id;
    private Long customerId;
    private AddressType addressType;
    private String firstName;
    private String lastName;
    private String company;
    private String street;
    private String street2;
    private String city;
    private String stateProvince;
    private String postalCode;
    private String country;
    private String phone;
    private Boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

