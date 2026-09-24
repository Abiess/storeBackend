package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreProduct;
import storebackend.entity.Store;
import storebackend.entity.Product;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreProductRepository extends JpaRepository<StoreProduct, Long> {

    List<StoreProduct> findByStoreAndIsActive(Store store, Boolean isActive);

    List<StoreProduct> findByStore(Store store);

    Optional<StoreProduct> findByStoreAndSupplierProduct(Store store, Product supplierProduct);

    boolean existsByStoreAndSupplierProduct(Store store, Product supplierProduct);

    @Query("SELECT COUNT(sp) FROM StoreProduct sp WHERE sp.supplierProduct.id = :productId AND sp.isActive = true")
    Long countActiveImportsByProduct(@Param("productId") Long productId);
}

