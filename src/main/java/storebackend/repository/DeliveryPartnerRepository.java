package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import storebackend.entity.DeliveryPartner;

import java.util.List;
import java.util.Optional;

public interface DeliveryPartnerRepository extends JpaRepository<DeliveryPartner, Long> {

    Optional<DeliveryPartner> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<DeliveryPartner> findByActiveTrue();

    List<DeliveryPartner> findByActiveTrueAndVerifiedTrue();

    List<DeliveryPartner> findByFeaturedTrueAndActiveTrue();

    @Query("SELECT p FROM DeliveryPartner p WHERE p.active = true " +
           "AND (:type IS NULL OR p.type = :type) " +
           "AND (:verified IS NULL OR p.verified = :verified) " +
           "AND (:search IS NULL OR LOWER(p.companyName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "    OR LOWER(p.contactName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "    OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY p.featured DESC, p.averageRating DESC, p.completedDeliveries DESC")
    List<DeliveryPartner> searchPartners(
        @Param("type") String type,
        @Param("verified") Boolean verified,
        @Param("search") String search
    );
}

