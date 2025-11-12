package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.InventoryLog;

import java.util.List;

@Repository
public interface InventoryLogRepository extends JpaRepository<InventoryLog, Long> {
    List<InventoryLog> findByVariantIdOrderByTimestampDesc(Long variantId);
    List<InventoryLog> findByVariant_Product_Store_IdOrderByTimestampDesc(Long storeId);
}

