package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreDeliverySettings;

import java.util.Optional;

@Repository
public interface StoreDeliverySettingsRepository extends JpaRepository<StoreDeliverySettings, Long> {
    Optional<StoreDeliverySettings> findByStoreId(Long storeId);
}

