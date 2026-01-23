package storebackend.dto;

import lombok.Data;
import storebackend.enums.DeliveryProviderType;
import java.time.LocalDateTime;

/**
 * DTO for delivery provider responses
 */
@Data
public class DeliveryProviderDTO {
    private Long id;
    private Long storeId;
    private String name;
    private DeliveryProviderType type;
    private Boolean isActive;
    private Integer priority;
    private String configJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

