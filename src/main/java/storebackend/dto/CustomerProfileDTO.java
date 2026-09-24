package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.Address;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerProfileDTO {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private Address defaultShippingAddress;
    private Address defaultBillingAddress;
    private String createdAt;
    private String updatedAt;
}

