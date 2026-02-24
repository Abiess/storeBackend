package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateReviewRequest;
import storebackend.dto.ProductReviewDTO;
import storebackend.dto.ProductReviewStats;
import storebackend.entity.*;
import storebackend.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductReviewService {

    private final ProductReviewRepository reviewRepository;
    private final ReviewVoteRepository voteRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;

    /**
     * Create a new review
     */
    @Transactional
    public ProductReviewDTO createReview(CreateReviewRequest request, User customer) {
        // Validate rating
        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        // Check if product exists
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Check if customer already reviewed this product
        if (reviewRepository.existsByProductIdAndCustomerId(request.getProductId(), customer.getId())) {
            throw new RuntimeException("You have already reviewed this product");
        }

        // Check if verified purchase
        boolean isVerifiedPurchase = false;
        Order order = null;
        if (request.getOrderId() != null) {
            order = orderRepository.findById(request.getOrderId()).orElse(null);
            if (order != null && order.getCustomer().getId().equals(customer.getId())) {
                // Check if order contains this product
                List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
                boolean hasProduct = orderItems.stream()
                        .anyMatch(item -> item.getProduct().getId().equals(request.getProductId()));
                isVerifiedPurchase = hasProduct;
            }
        }

        // Create review
        ProductReview review = new ProductReview();
        review.setProduct(product);
        review.setCustomer(customer);
        review.setOrder(order);
        review.setRating(request.getRating());
        review.setTitle(request.getTitle());
        review.setComment(request.getComment());
        review.setIsVerifiedPurchase(isVerifiedPurchase);
        review.setIsApproved(false); // Requires moderation by default
        review.setHelpfulCount(0);
        review.setNotHelpfulCount(0);

        review = reviewRepository.save(review);

        log.info("Review created: Product={}, Customer={}, Rating={}",
                request.getProductId(), customer.getId(), request.getRating());

        return mapToDTO(review, null);
    }

    /**
     * Get all approved reviews for a product
     */
    public List<ProductReviewDTO> getProductReviews(Long productId, Long currentUserId) {
        List<ProductReview> reviews = reviewRepository.findByProductIdAndIsApprovedTrueOrderByCreatedAtDesc(productId);
        return reviews.stream()
                .map(review -> mapToDTO(review, currentUserId))
                .collect(Collectors.toList());
    }

    public Page<ProductReviewDTO> getProductReviewsPaged(Long productId, Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ProductReview> reviews = reviewRepository.findByProductIdAndIsApprovedTrue(productId, pageable);
        return reviews.map(review -> mapToDTO(review, currentUserId));
    }

    /**
     * Get reviews by customer
     */
    public List<ProductReviewDTO> getCustomerReviews(Long customerId) {
        List<ProductReview> reviews = reviewRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return reviews.stream()
                .map(review -> mapToDTO(review, customerId))
                .collect(Collectors.toList());
    }

    /**
     * Get pending reviews for moderation
     */
    public List<ProductReviewDTO> getPendingReviews() {
        List<ProductReview> reviews = reviewRepository.findByIsApprovedFalseOrderByCreatedAtDesc();
        return reviews.stream()
                .map(review -> mapToDTO(review, null))
                .collect(Collectors.toList());
    }

    public Page<ProductReviewDTO> getPendingReviewsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ProductReview> reviews = reviewRepository.findByIsApprovedFalse(pageable);
        return reviews.map(review -> mapToDTO(review, null));
    }

    /**
     * Get all reviews for a store (for store owner)
     */
    public List<ProductReviewDTO> getStoreReviews(Long storeId) {
        List<ProductReview> reviews = reviewRepository.findByStoreId(storeId);
        return reviews.stream()
                .map(review -> mapToDTO(review, null))
                .collect(Collectors.toList());
    }

    public Page<ProductReviewDTO> getStoreReviewsPaged(Long storeId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ProductReview> reviews = reviewRepository.findByStoreId(storeId, pageable);
        return reviews.map(review -> mapToDTO(review, null));
    }

    /**
     * Approve a review (Admin/Store Owner)
     */
    @Transactional
    public ProductReviewDTO approveReview(Long reviewId, User approver) {
        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setIsApproved(true);
        review.setApprovedAt(LocalDateTime.now());
        review.setApprovedBy(approver);

        review = reviewRepository.save(review);

        log.info("Review approved: ID={}, ApprovedBy={}", reviewId, approver.getId());

        return mapToDTO(review, null);
    }

    /**
     * Delete a review
     */
    @Transactional
    public void deleteReview(Long reviewId) {
        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        reviewRepository.delete(review);

        log.info("Review deleted: ID={}", reviewId);
    }

    /**
     * Vote on a review (helpful/not helpful)
     */
    @Transactional
    public ProductReviewDTO voteReview(Long reviewId, boolean isHelpful, User user) {
        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        // Check if user already voted
        if (voteRepository.existsByReviewIdAndUserId(reviewId, user.getId())) {
            throw new RuntimeException("You have already voted on this review");
        }

        // Create vote
        ReviewVote vote = new ReviewVote();
        vote.setReview(review);
        vote.setUser(user);
        vote.setIsHelpful(isHelpful);
        voteRepository.save(vote);

        // Update review counts
        if (isHelpful) {
            review.setHelpfulCount(review.getHelpfulCount() + 1);
        } else {
            review.setNotHelpfulCount(review.getNotHelpfulCount() + 1);
        }

        review = reviewRepository.save(review);

        log.info("Review voted: ReviewID={}, UserID={}, Helpful={}", reviewId, user.getId(), isHelpful);

        return mapToDTO(review, user.getId());
    }

    /**
     * Get review statistics for a product
     */
    public ProductReviewStats getProductReviewStats(Long productId) {
        java.math.BigDecimal avgRating = reviewRepository.getAverageRating(productId);
        Long totalApproved = reviewRepository.countApprovedReviews(productId);

        ProductReviewStats stats = new ProductReviewStats();
        stats.setProductId(productId);
        stats.setAverageRating(avgRating != null ? avgRating.setScale(1, java.math.RoundingMode.HALF_UP).doubleValue() : 0.0);
        stats.setTotalApprovedReviews(totalApproved != null ? totalApproved.intValue() : 0);
        stats.setTotalReviews(totalApproved != null ? totalApproved.intValue() : 0);

        // Rating distribution
        stats.setFiveStarCount(reviewRepository.countByRating(productId, 5));
        stats.setFourStarCount(reviewRepository.countByRating(productId, 4));
        stats.setThreeStarCount(reviewRepository.countByRating(productId, 3));
        stats.setTwoStarCount(reviewRepository.countByRating(productId, 2));
        stats.setOneStarCount(reviewRepository.countByRating(productId, 1));

        // Recent reviews (top 5)
        Pageable pageable = PageRequest.of(0, 5, Sort.by("createdAt").descending());
        Page<ProductReview> recentReviews = reviewRepository.findByProductIdAndIsApprovedTrue(productId, pageable);
        stats.setRecentReviews(recentReviews.stream()
                .map(review -> mapToDTO(review, null))
                .collect(Collectors.toList()));

        return stats;
    }

    /**
     * Map entity to DTO
     */
    private ProductReviewDTO mapToDTO(ProductReview review, Long currentUserId) {
        ProductReviewDTO dto = new ProductReviewDTO();
        dto.setId(review.getId());
        dto.setProductId(review.getProduct().getId());
        dto.setCustomerId(review.getCustomer().getId());
        dto.setCustomerName(review.getCustomer().getName() != null ?
                review.getCustomer().getName() :
                review.getCustomer().getEmail().split("@")[0]);
        dto.setOrderId(review.getOrder() != null ? review.getOrder().getId() : null);
        dto.setRating(review.getRating());
        dto.setTitle(review.getTitle());
        dto.setComment(review.getComment());
        dto.setIsVerifiedPurchase(review.getIsVerifiedPurchase());
        dto.setIsApproved(review.getIsApproved());
        dto.setHelpfulCount(review.getHelpfulCount());
        dto.setNotHelpfulCount(review.getNotHelpfulCount());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setUpdatedAt(review.getUpdatedAt());

        // Check if current user voted
        if (currentUserId != null) {
            voteRepository.findByReviewIdAndUserId(review.getId(), currentUserId).ifPresent(vote -> {
                dto.setCurrentUserVoted(true);
                dto.setCurrentUserVotedHelpful(vote.getIsHelpful());
            });
        }

        return dto;
    }
}

