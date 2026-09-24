package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.CannedResponse;

import java.util.List;
import java.util.Optional;

@Repository
public interface CannedResponseRepository extends JpaRepository<CannedResponse, Long> {

    @Query("SELECT cr FROM CannedResponse cr WHERE cr.store.id = :storeId AND cr.isActive = true ORDER BY cr.usageCount DESC")
    List<CannedResponse> findByStoreIdAndIsActiveTrueOrderByUsageCountDesc(@Param("storeId") Long storeId);

    @Query("SELECT cr FROM CannedResponse cr WHERE cr.store.id = :storeId AND cr.shortcut = :shortcut")
    Optional<CannedResponse> findByStoreIdAndShortcut(@Param("storeId") Long storeId, @Param("shortcut") String shortcut);

    @Query("SELECT cr FROM CannedResponse cr WHERE cr.store.id = :storeId AND cr.category = :category AND cr.isActive = true")
    List<CannedResponse> findByStoreIdAndCategoryAndIsActiveTrue(@Param("storeId") Long storeId, @Param("category") String category);
}
