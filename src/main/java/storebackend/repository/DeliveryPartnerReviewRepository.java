package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import storebackend.entity.DeliveryPartnerReview;

import java.util.List;

public interface DeliveryPartnerReviewRepository extends JpaRepository<DeliveryPartnerReview, Long> {

    List<DeliveryPartnerReview> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);

    boolean existsByPartnerIdAndReviewerId(Long partnerId, Long reviewerId);

    @Query("SELECT AVG(r.rating) FROM DeliveryPartnerReview r WHERE r.partner.id = :partnerId")
    Double getAverageRating(@Param("partnerId") Long partnerId);

    @Query("SELECT COUNT(r) FROM DeliveryPartnerReview r WHERE r.partner.id = :partnerId")
    Integer getReviewCount(@Param("partnerId") Long partnerId);
}

