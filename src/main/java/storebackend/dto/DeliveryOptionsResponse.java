package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.DeliveryMode;
import java.math.BigDecimal;
import java.util.List;

/**
 * Response DTO for delivery options at checkout
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryOptionsResponse {
    private Boolean pickupAvailable;
    private Boolean deliveryAvailable;
    private List<DeliveryModeOption> modes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryModeOption {
        private DeliveryMode mode;
        private BigDecimal fee;
        private Integer etaMinutes;
    }
}

