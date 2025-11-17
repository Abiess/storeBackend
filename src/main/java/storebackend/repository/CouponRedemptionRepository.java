package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.CouponRedemption;

import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, Long> {

    List<CouponRedemption> findByStoreIdAndCouponId(Long storeId, Long couponId);

    @Query("SELECT COUNT(r) FROM CouponRedemption r WHERE r.storeId = :storeId AND r.couponId = :couponId AND r.customerEmail = :email")
    long countByStoreIdAndCouponIdAndCustomerEmail(Long storeId, Long couponId, String email);

    Optional<CouponRedemption> findByOrderId(Long orderId);

    @Query("SELECT SUM(r.appliedCents) FROM CouponRedemption r WHERE r.storeId = :storeId AND r.couponId = :couponId")
    Long sumAppliedCentsByCouponId(Long storeId, Long couponId);
}

