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

    /**
     * Native Query mit PostgreSQL ILIKE + CAST AS TEXT, um den
     * "lower(bytea) does not exist"-Fehler zu vermeiden.
     * ILIKE ist bereits case-insensitiv – kein LOWER() nötig.
     */
    @Query(value = """
        SELECT * FROM delivery_partners dp
        WHERE dp.active = true
          AND (:type    IS NULL OR dp.partner_type = :type)
          AND (:verified IS NULL OR dp.verified    = :verified)
          AND (
               CAST(:search AS TEXT) IS NULL
            OR CAST(dp.company_name  AS TEXT) ILIKE CONCAT('%', CAST(:search AS TEXT), '%')
            OR CAST(dp.contact_name  AS TEXT) ILIKE CONCAT('%', CAST(:search AS TEXT), '%')
            OR CAST(dp.description   AS TEXT) ILIKE CONCAT('%', CAST(:search AS TEXT), '%')
          )
        ORDER BY dp.featured DESC, dp.average_rating DESC, dp.completed_deliveries DESC
        """, nativeQuery = true)
    List<DeliveryPartner> searchPartners(
        @Param("type")     String  type,
        @Param("verified") Boolean verified,
        @Param("search")   String  search
    );
}

