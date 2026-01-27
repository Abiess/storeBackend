package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.DeliveryProviderType;

/**
 * DTO for creating/updating delivery providers
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryProviderRequest {

    @NotBlank(message = "Provider name is required")
    private String name;

    @NotNull(message = "Provider type is required")
    private DeliveryProviderType type;

    @NotNull(message = "Active status is required")
    private Boolean isActive;

    @NotNull(message = "Priority is required")
    @Min(value = 0, message = "Priority must be >= 0")
    private Integer priority;

    private String configJson;
}
