package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.SharedProductStock;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface SharedProductStockRepository extends JpaRepository<SharedProductStock, Long> {
    Optional<SharedProductStock> findByProductId(Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SharedProductStock s where s.product.id = :productId")
    Optional<SharedProductStock> lockByProductId(@Param("productId") Long productId);
}
