package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DropshippingSource;

import java.util.List;
import java.util.Optional;

/**
 * Repository für Dropshipping Sources
 */
@Repository
public interface DropshippingSourceRepository extends JpaRepository<DropshippingSource, Long> {

    /**
     * Findet Dropshipping Source für eine Variant
     */
    Optional<DropshippingSource> findByVariantId(Long variantId);

    /**
     * Prüft ob eine Variant eine Dropshipping Source hat
     */
    boolean existsByVariantId(Long variantId);

    /**
     * Findet alle Dropshipping Sources für ein Product
     */
    @Query("SELECT ds FROM DropshippingSource ds " +
           "JOIN FETCH ds.variant v " +
           "WHERE v.product.id = :productId")
    List<DropshippingSource> findByProductId(@Param("productId") Long productId);

    /**
     * Findet alle Dropshipping Sources für einen Store
     */
    @Query("SELECT ds FROM DropshippingSource ds " +
           "JOIN FETCH ds.variant v " +
           "WHERE v.product.store.id = :storeId")
    List<DropshippingSource> findByStoreId(@Param("storeId") Long storeId);

    /**
     * Findet alle Dropshipping Sources erstellt von einem User
     */
    @Query("SELECT ds FROM DropshippingSource ds " +
           "JOIN FETCH ds.variant v " +
           "WHERE ds.createdBy.id = :userId")
    List<DropshippingSource> findByCreatedById(@Param("userId") Long userId);

    /**
     * Löscht Dropshipping Source für eine Variant
     */
    void deleteByVariantId(Long variantId);

    /**
     * Count Dropshipping Sources für einen Store
     */
    @Query("SELECT COUNT(ds) FROM DropshippingSource ds " +
           "WHERE ds.variant.product.store.id = :storeId")
    long countByStoreId(@Param("storeId") Long storeId);
}

