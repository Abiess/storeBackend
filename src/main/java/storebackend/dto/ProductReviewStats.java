package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Product statistics including review data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReviewStats {
    private Long productId;
    private Double averageRating; // e.g. 4.3
    private Integer totalReviews;
    private Integer totalApprovedReviews;

    // Rating distribution
    private Integer fiveStarCount;
    private Integer fourStarCount;
    private Integer threeStarCount;
    private Integer twoStarCount;
    private Integer oneStarCount;

    // Recent reviews
    private List<ProductReviewDTO> recentReviews;
}

