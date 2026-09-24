package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Wishlist;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    List<Wishlist> findByStoreIdAndCustomerId(Long storeId, Long customerId);

    Optional<Wishlist> findByStoreIdAndCustomerIdAndIsDefaultTrue(Long storeId, Long customerId);

    Optional<Wishlist> findByShareToken(String shareToken);

    List<Wishlist> findByStoreId(Long storeId);

    long countByCustomerId(Long customerId);
}

