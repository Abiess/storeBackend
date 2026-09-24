package storebackend.dto;

import lombok.Data;
import storebackend.entity.Address;

@Data
public class SaveAddressRequest {
    private Address shippingAddress;
    private Address billingAddress;
}
