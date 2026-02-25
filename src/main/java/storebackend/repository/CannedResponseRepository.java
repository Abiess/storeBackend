package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.CannedResponse;

import java.util.List;
import java.util.Optional;

@Repository
public interface CannedResponseRepository extends JpaRepository<CannedResponse, Long> {
    List<CannedResponse> findByStoreIdAndIsActiveTrueOrderByUsageCountDesc(Long storeId);

    Optional<CannedResponse> findByStoreIdAndShortcut(Long storeId, String shortcut);

    List<CannedResponse> findByStoreIdAndCategoryAndIsActiveTrue(Long storeId, String category);
}

