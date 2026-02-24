package storebackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.ProductReview;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    // Find all approved reviews for a product
    List<ProductReview> findByProductIdAndIsApprovedTrueOrderByCreatedAtDesc(Long productId);

    Page<ProductReview> findByProductIdAndIsApprovedTrue(Long productId, Pageable pageable);

    // Find all reviews by customer
    List<ProductReview> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // Find pending reviews (for moderation)
    List<ProductReview> findByIsApprovedFalseOrderByCreatedAtDesc();

    Page<ProductReview> findByIsApprovedFalse(Pageable pageable);

    // Check if customer already reviewed this product
    boolean existsByProductIdAndCustomerId(Long productId, Long customerId);

    Optional<ProductReview> findByProductIdAndCustomerId(Long productId, Long customerId);

    // Statistics queries
    @Query("SELECT AVG(r.rating) FROM ProductReview r WHERE r.product.id = :productId AND r.isApproved = true")
    Double getAverageRating(@Param("productId") Long productId);

    @Query("SELECT COUNT(r) FROM ProductReview r WHERE r.product.id = :productId AND r.isApproved = true")
    Long countApprovedReviews(@Param("productId") Long productId);

    @Query("SELECT COUNT(r) FROM ProductReview r WHERE r.product.id = :productId AND r.isApproved = true AND r.rating = :rating")
    Integer countByRating(@Param("productId") Long productId, @Param("rating") Integer rating);

    // Get reviews for store owner (all reviews for their products)
    @Query("SELECT r FROM ProductReview r WHERE r.product.store.id = :storeId ORDER BY r.createdAt DESC")
    List<ProductReview> findByStoreId(@Param("storeId") Long storeId);

    @Query("SELECT r FROM ProductReview r WHERE r.product.store.id = :storeId")
    Page<ProductReview> findByStoreId(@Param("storeId") Long storeId, Pageable pageable);
}

