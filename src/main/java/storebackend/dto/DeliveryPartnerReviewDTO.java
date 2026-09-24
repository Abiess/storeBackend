package storebackend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO für Delivery-Partner-Bewertung
 */
@Data
public class DeliveryPartnerReviewDTO {
    private Long id;
    private Long partnerId;
    private Long reviewerUserId;
    private String reviewerStoreName;
    @Min(1) @Max(5)
    private Integer rating;
    private String comment;
    @Min(1) @Max(5)
    private Integer reliability;
    @Min(1) @Max(5)
    private Integer speed;
    @Min(1) @Max(5)
    private Integer communication;
    @Min(1) @Max(5)
    private Integer priceQuality;
    private LocalDateTime createdAt;
}

