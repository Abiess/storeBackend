package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Store;
import storebackend.entity.WooCommerceImportJob;

import java.util.List;

@Repository
public interface WooCommerceImportJobRepository extends JpaRepository<WooCommerceImportJob, Long> {
    
    /**
     * Findet alle Jobs für einen Store (neueste zuerst)
     */
    List<WooCommerceImportJob> findByStoreOrderByStartedAtDesc(Store store);
    
    /**
     * Findet alle Jobs für einen Store (by ID)
     */
    List<WooCommerceImportJob> findByStoreIdOrderByStartedAtDesc(Long storeId);
    
    /**
     * Findet laufende Jobs für einen Store
     */
    List<WooCommerceImportJob> findByStoreIdAndStatus(Long storeId, String status);
}
