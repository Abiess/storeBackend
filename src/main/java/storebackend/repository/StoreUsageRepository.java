package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Store;
import storebackend.entity.StoreUsage;

import java.util.Optional;

@Repository
public interface StoreUsageRepository extends JpaRepository<StoreUsage, Long> {
    Optional<StoreUsage> findByStore(Store store);
    Optional<StoreUsage> findByStoreId(Long storeId);
}

