package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DeliveryZone;

import java.util.List;

@Repository
public interface DeliveryZoneRepository extends JpaRepository<DeliveryZone, Long> {

    List<DeliveryZone> findByStoreIdOrderByNameAsc(Long storeId);

    @Query("SELECT dz FROM DeliveryZone dz WHERE dz.store.id = :storeId AND dz.isActive = true")
    List<DeliveryZone> findActiveByStoreId(@Param("storeId") Long storeId);
}

