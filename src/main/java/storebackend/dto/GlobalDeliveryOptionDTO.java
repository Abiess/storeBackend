package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for global platform-managed delivery options.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalDeliveryOptionDTO {

    private Long id;

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String deliveryType;

    @NotNull
    private BigDecimal price;

    private Integer etaMinDays;
    private Integer etaMaxDays;
    private String icon;
    private Boolean isActive;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

