package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Coupon;

import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByStoreIdAndCodeNormalized(Long storeId, String codeNormalized);

    Optional<Coupon> findByStoreIdAndId(Long storeId, Long id);

    List<Coupon> findByStoreIdAndStatus(Long storeId, Coupon.CouponStatus status);

    List<Coupon> findByStoreIdAndAutoApplyTrue(Long storeId);
}

