package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.SavedCart;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SavedCartRepository extends JpaRepository<SavedCart, Long> {

    List<SavedCart> findByStoreIdAndCustomerId(Long storeId, Long customerId);

    List<SavedCart> findByStoreId(Long storeId);

    long countByCustomerId(Long customerId);

    @Modifying
    @Query("DELETE FROM SavedCart sc WHERE sc.expiresAt IS NOT NULL AND sc.expiresAt < :now")
    int deleteExpiredCarts(LocalDateTime now);
}

