package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SeoAsset;

import java.util.List;

@Repository
public interface SeoAssetRepository extends JpaRepository<SeoAsset, Long> {

    List<SeoAsset> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<SeoAsset> findByStoreIdAndType(Long storeId, SeoAsset.AssetType type);
}

