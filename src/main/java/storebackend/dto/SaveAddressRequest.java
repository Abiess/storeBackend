package storebackend.dto;

import lombok.Data;
import storebackend.entity.Address;

@Data
public class SaveAddressRequest {
    private Address address;
    private String type; // "shipping" or "billing"
}
