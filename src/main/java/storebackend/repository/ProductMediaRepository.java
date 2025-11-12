package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.ProductMedia;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductMediaRepository extends JpaRepository<ProductMedia, Long> {
    List<ProductMedia> findByProductIdOrderBySortOrderAsc(Long productId);
    Optional<ProductMedia> findByProductIdAndIsPrimaryTrue(Long productId);
    void deleteByProductId(Long productId);
}

