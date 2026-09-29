package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StoreCustomerLoginRequest {
    @NotBlank
    private String identifier;

    @NotBlank
    private String password;
}
