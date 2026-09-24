package storebackend.dto;

import lombok.Data;

/**
 * Request DTO für Update des Order-Status
 */
@Data
public class UpdateOrderStatusRequest {
    private String status;
    private String trackingNumber;
    private String notes;
}
