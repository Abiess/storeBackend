package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;
import java.math.BigDecimal;

/**
 * Request DTO for checking delivery options at checkout
 */
@Data
public class DeliveryOptionsRequest {

    @NotNull(message = "Store ID is required")
    private Long storeId;

    @NotNull(message = "Cart total is required")
    @DecimalMin(value = "0.0", message = "Cart total must be >= 0")
    private BigDecimal cartTotal;

    @NotNull(message = "Address is required")
    private AddressDTO address;

    @Data
    public static class AddressDTO {
        @NotBlank(message = "Country is required")
        private String country;

        private String city;

        private String postalCode;
    }
}

