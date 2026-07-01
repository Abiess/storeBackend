package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Store;
import storebackend.entity.WooCommerceImportLog;

import java.util.List;
import java.util.Optional;

@Repository
public interface WooCommerceImportLogRepository extends JpaRepository<WooCommerceImportLog, Long> {
    
    /**
     * Findet Log-Einträge für einen Store (neueste zuerst)
     */
    List<WooCommerceImportLog> findByStoreOrderByImportedAtDesc(Store store);
    
    /**
     * Findet Log-Einträge für einen Job
     */
    List<WooCommerceImportLog> findByJobId(Long jobId);
    
    /**
     * Prüft ob WooCommerce Product bereits importiert wurde
     */
    boolean existsByStoreIdAndWoocommerceProductId(Long storeId, Long woocommerceProductId);
    
    /**
     * Findet Log-Eintrag für WooCommerce Product
     */
    Optional<WooCommerceImportLog> findByStoreIdAndWoocommerceProductId(Long storeId, Long woocommerceProductId);
    
    /**
     * Findet Log-Eintrag für SKU
     */
    Optional<WooCommerceImportLog> findByStoreIdAndSku(Long storeId, String sku);
}
