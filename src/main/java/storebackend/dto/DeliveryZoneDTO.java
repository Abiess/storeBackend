package storebackend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for delivery zone responses
 */
@Data
public class DeliveryZoneDTO {
    private Long id;
    private Long storeId;
    private String name;
    private Boolean isActive;
    private String country;
    private String city;
    private String postalCodeRanges;
    private BigDecimal minOrderValue;
    private BigDecimal feeStandard;
    private BigDecimal feeExpress;
    private Integer etaStandardMinutes;
    private Integer etaExpressMinutes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

