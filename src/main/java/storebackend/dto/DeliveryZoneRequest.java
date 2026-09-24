package storebackend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

/**
 * DTO for creating/updating delivery zones
 */
@Data
public class DeliveryZoneRequest {

    @NotBlank(message = "Zone name is required")
    private String name;

    @NotNull(message = "Active status is required")
    private Boolean isActive;

    @NotBlank(message = "Country is required")
    private String country;

    private String city;

    private String postalCodeRanges; // JSON string: ["20000-20999","21000"]

    @DecimalMin(value = "0.0", message = "Min order value must be >= 0")
    private BigDecimal minOrderValue;

    @NotNull(message = "Standard fee is required")
    @DecimalMin(value = "0.0", message = "Standard fee must be >= 0")
    private BigDecimal feeStandard;

    @DecimalMin(value = "0.0", message = "Express fee must be >= 0")
    private BigDecimal feeExpress;

    @NotNull(message = "Standard ETA is required")
    @Min(value = 1, message = "Standard ETA must be >= 1 minute")
    private Integer etaStandardMinutes;

    @Min(value = 1, message = "Express ETA must be >= 1 minute")
    private Integer etaExpressMinutes;
}

