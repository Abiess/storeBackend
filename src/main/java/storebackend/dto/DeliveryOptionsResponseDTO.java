package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO containing all available delivery options for a store
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryOptionsResponseDTO {

    /**
     * Whether pickup is enabled for this store
     */
    private boolean pickupEnabled;

    /**
     * Whether delivery is enabled for this store
     */
    private boolean deliveryEnabled;

    /**
     * Whether express delivery is enabled for this store
     */
    private boolean expressEnabled;

    /**
     * Store currency (e.g. "EUR", "MAD")
     */
    private String currency;

    /**
     * List of all delivery options (PICKUP, DELIVERY STANDARD, DELIVERY EXPRESS)
     */
    private List<DeliveryOptionDTO> options;
}

