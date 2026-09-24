package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReviewRequest {
    private Long productId;
    private Long orderId; // Optional: for verified purchase
    private Integer rating; // 1-5
    private String title;
    private String comment;
}

