package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for public delivery options endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryOptionsRequestDTO {

    /**
     * Postal code for delivery address (required)
     */
    @NotBlank(message = "Postal code is required")
    private String postalCode;

    /**
     * City for delivery address (optional)
     */
    private String city;

    /**
     * Country for delivery address (optional)
     */
    private String country;
}

