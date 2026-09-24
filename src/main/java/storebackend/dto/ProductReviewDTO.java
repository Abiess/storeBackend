package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReviewDTO {
    private Long id;
    private Long productId;
    private Long customerId;
    private String customerName;
    private Long orderId;
    private Integer rating;
    private String title;
    private String comment;
    private Boolean isVerifiedPurchase;
    private Boolean isApproved;
    private Integer helpfulCount;
    private Integer notHelpfulCount;
    private Boolean currentUserVoted; // true if current user already voted
    private Boolean currentUserVotedHelpful; // true if voted helpful, false if not helpful
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

