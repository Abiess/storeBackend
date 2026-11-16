package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.SharedProductStock;
import java.util.Optional;

public interface SharedProductStockRepository extends JpaRepository<SharedProductStock, Long> {
    Optional<SharedProductStock> findByProductId(Long productId);
}
