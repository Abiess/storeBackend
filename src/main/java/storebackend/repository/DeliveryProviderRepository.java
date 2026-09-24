package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DeliveryProvider;
import storebackend.enums.DeliveryProviderType;

import java.util.List;

@Repository
public interface DeliveryProviderRepository extends JpaRepository<DeliveryProvider, Long> {

    List<DeliveryProvider> findByStoreIdOrderByPriorityAsc(Long storeId);

    @Query("SELECT dp FROM DeliveryProvider dp WHERE dp.store.id = :storeId AND dp.isActive = true ORDER BY dp.priority ASC")
    List<DeliveryProvider> findActiveByStoreId(@Param("storeId") Long storeId);

    @Query("SELECT dp FROM DeliveryProvider dp WHERE dp.store.id = :storeId AND dp.isActive = true AND dp.type = :type ORDER BY dp.priority ASC")
    List<DeliveryProvider> findActiveByStoreIdAndType(@Param("storeId") Long storeId, @Param("type") DeliveryProviderType type);
}

