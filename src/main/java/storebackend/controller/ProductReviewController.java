package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateReviewRequest;
import storebackend.dto.ProductReviewDTO;
import storebackend.dto.ProductReviewStats;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductReviewService;
import storebackend.util.StoreAccessChecker;

import java.util.List;
import java.util.Map;

/**
 * Product Review Management Controller
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Product Reviews", description = "Product review and rating management")
public class ProductReviewController {

    private final ProductReviewService reviewService;
    private final StoreRepository storeRepository;

    /**
     * PUBLIC: Get all approved reviews for a product
     * GET /api/products/{productId}/reviews
     */
    @GetMapping("/products/{productId}/reviews")
    @Operation(summary = "Get all approved reviews for a product")
    public ResponseEntity<List<ProductReviewDTO>> getProductReviews(
            @PathVariable Long productId,
            @AuthenticationPrincipal User user) {
        Long currentUserId = user != null ? user.getId() : null;
        List<ProductReviewDTO> reviews = reviewService.getProductReviews(productId, currentUserId);
        return ResponseEntity.ok(reviews);
    }

    /**
     * PUBLIC: Get product review statistics
     * GET /api/products/{productId}/reviews/stats
     */
    @GetMapping("/products/{productId}/reviews/stats")
    @Operation(summary = "Get product review statistics (average rating, counts)")
    public ResponseEntity<ProductReviewStats> getProductReviewStats(@PathVariable Long productId) {
        ProductReviewStats stats = reviewService.getProductReviewStats(productId);
        return ResponseEntity.ok(stats);
    }

    /**
     * AUTHENTICATED: Create a review
     * POST /api/products/{productId}/reviews
     */
    @PostMapping("/products/{productId}/reviews")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Create a product review (requires authentication)")
    public ResponseEntity<?> createReview(
            @PathVariable Long productId,
            @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized - Please login to review products");
        }

        request.setProductId(productId);

        try {
            ProductReviewDTO review = reviewService.createReview(request, user);
            return ResponseEntity.status(201).body(review);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * AUTHENTICATED: Get current user's reviews
     * GET /api/customer/reviews
     */
    @GetMapping("/customer/reviews")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get all reviews by current user")
    public ResponseEntity<?> getMyReviews(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        List<ProductReviewDTO> reviews = reviewService.getCustomerReviews(user.getId());
        return ResponseEntity.ok(reviews);
    }

    /**
     * AUTHENTICATED: Vote on a review (helpful/not helpful)
     * POST /api/reviews/{reviewId}/vote
     */
    @PostMapping("/reviews/{reviewId}/vote")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Vote on a review (helpful or not helpful)")
    public ResponseEntity<?> voteReview(
            @PathVariable Long reviewId,
            @RequestParam boolean helpful,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            ProductReviewDTO review = reviewService.voteReview(reviewId, helpful, user);
            return ResponseEntity.ok(review);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * STORE OWNER: Get all reviews for store products
     * GET /api/stores/{storeId}/reviews
     */
    @GetMapping("/stores/{storeId}/reviews")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get all reviews for store products (store owner)")
    public ResponseEntity<?> getStoreReviews(
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        Page<ProductReviewDTO> reviews = reviewService.getStoreReviewsPaged(storeId, page, size);
        return ResponseEntity.ok(reviews);
    }

    /**
     * STORE OWNER: Approve a review
     * PUT /api/stores/{storeId}/reviews/{reviewId}/approve
     */
    @PutMapping("/stores/{storeId}/reviews/{reviewId}/approve")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Approve a review (store owner)")
    public ResponseEntity<?> approveReview(
            @PathVariable Long storeId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        try {
            ProductReviewDTO review = reviewService.approveReview(reviewId, user);
            return ResponseEntity.ok(review);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * STORE OWNER: Delete a review
     * DELETE /api/stores/{storeId}/reviews/{reviewId}
     */
    @DeleteMapping("/stores/{storeId}/reviews/{reviewId}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete a review (store owner)")
    public ResponseEntity<?> deleteReview(
            @PathVariable Long storeId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        try {
            reviewService.deleteReview(reviewId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * ADMIN: Get pending reviews for moderation
     * GET /api/admin/reviews/pending
     */
    @GetMapping("/admin/reviews/pending")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get pending reviews for moderation (admin)")
    public ResponseEntity<?> getPendingReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        // TODO: Add admin role check
        Page<ProductReviewDTO> reviews = reviewService.getPendingReviewsPaged(page, size);
        return ResponseEntity.ok(reviews);
    }
}

