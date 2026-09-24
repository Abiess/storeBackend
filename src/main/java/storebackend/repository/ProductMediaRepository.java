package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.ProductMedia;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductMediaRepository extends JpaRepository<ProductMedia, Long> {

    @Query("SELECT pm FROM ProductMedia pm JOIN FETCH pm.media WHERE pm.product.id = :productId ORDER BY pm.sortOrder ASC")
    List<ProductMedia> findByProductIdOrderBySortOrderAsc(@Param("productId") Long productId);

    @Query("SELECT pm FROM ProductMedia pm JOIN FETCH pm.media WHERE pm.product.id = :productId AND pm.isPrimary = true")
    Optional<ProductMedia> findByProductIdAndIsPrimaryTrue(@Param("productId") Long productId);

    void deleteByProductId(Long productId);
}
