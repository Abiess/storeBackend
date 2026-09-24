package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.WishlistItem;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    List<WishlistItem> findByWishlistId(Long wishlistId);

    Optional<WishlistItem> findByWishlistIdAndProductIdAndVariantId(Long wishlistId, Long productId, Long variantId);

    boolean existsByWishlistIdAndProductId(Long wishlistId, Long productId);

    @Query("SELECT COUNT(wi) FROM WishlistItem wi WHERE wi.wishlist.customerId = :customerId")
    long countByCustomerId(Long customerId);

    void deleteByWishlistId(Long wishlistId);
}

