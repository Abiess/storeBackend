package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SupplierProductMapping;

import java.util.Optional;

/**
 * Phase 3B-1B: Repository for supplier product mappings.
 */
@Repository
public interface SupplierProductMappingRepository extends JpaRepository<SupplierProductMapping, Long> {
    
    /**
     * Find active mapping by store, normalized supplier name, and article number.
     */
    Optional<SupplierProductMapping> findByStoreIdAndNormalizedSupplierNameAndSupplierArticleNumberAndActiveTrue(
        Long storeId,
        String normalizedSupplierName,
        String supplierArticleNumber
    );
    
    /**
     * Find all mappings for a store (for bulk operations).
     */
    java.util.List<SupplierProductMapping> findByStoreIdAndActiveTrue(Long storeId);
    
    /**
     * Find mappings by product (to update when product changes).
     */
    java.util.List<SupplierProductMapping> findByProductIdAndActiveTrue(Long productId);
}
