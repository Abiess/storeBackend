package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.DeliveryMode;
import storebackend.enums.DeliveryType;

import java.math.BigDecimal;

/**
 * Single delivery option (e.g. PICKUP, DELIVERY STANDARD, DELIVERY EXPRESS)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryOptionDTO {

    /**
     * Type of delivery: PICKUP or DELIVERY
     */
    private DeliveryType deliveryType;

    /**
     * Mode of delivery: STANDARD or EXPRESS (null for PICKUP)
     */
    private DeliveryMode deliveryMode;

    /**
     * Delivery fee in store currency
     */
    private BigDecimal fee;

    /**
     * Estimated time in minutes (null for PICKUP)
     */
    private Integer etaMinutes;

    /**
     * Whether this option is available for the given address
     */
    private boolean available;

    /**
     * Delivery zone ID (optional, only for DELIVERY options)
     */
    private Long zoneId;

    /**
     * Delivery zone name (optional, only for DELIVERY options)
     */
    private String zoneName;

    /**
     * Reason why option is unavailable (optional, only when available=false)
     */
    private String reason;
}

