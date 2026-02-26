package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Product;
import storebackend.entity.ProductVariant;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    // Find all variants by product with JOIN FETCH to eagerly load product
    @Query("SELECT pv FROM ProductVariant pv JOIN FETCH pv.product WHERE pv.product = :product")
    List<ProductVariant> findByProduct(@Param("product") Product product);

    // Find variant by ID with JOIN FETCH
    @Query("SELECT pv FROM ProductVariant pv JOIN FETCH pv.product WHERE pv.id = :id")
    Optional<ProductVariant> findByIdWithProduct(@Param("id") Long id);

    // Find all variants by product ID
    List<ProductVariant> findByProductId(Long productId);

    // Find variant by SKU
    Optional<ProductVariant> findBySku(String sku);
}
