package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Store;
import storebackend.entity.WooCommerceConfig;

import java.util.Optional;

@Repository
public interface WooCommerceConfigRepository extends JpaRepository<WooCommerceConfig, Long> {
    
    /**
     * Findet Config für einen Store
     */
    Optional<WooCommerceConfig> findByStore(Store store);
    
    /**
     * Findet Config für einen Store (by ID)
     */
    Optional<WooCommerceConfig> findByStoreId(Long storeId);
    
    /**
     * Prüft ob Config für Store existiert
     */
    boolean existsByStoreId(Long storeId);
}
