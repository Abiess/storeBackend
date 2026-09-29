package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateInvitedCustomerRequest {
    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 30)
    private String phone;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;
}
