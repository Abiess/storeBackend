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
package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.SeoSettings;

import java.util.Optional;

@Repository
public interface SeoSettingsRepository extends JpaRepository<SeoSettings, Long> {

    // Domain-specific settings (highest priority)
    Optional<SeoSettings> findByStoreIdAndDomainId(Long storeId, Long domainId);

    // Store-level default settings
    Optional<SeoSettings> findByStoreIdAndDomainIdIsNull(Long storeId);

    // For cache invalidation
    @Query("SELECT s.version FROM SeoSettings s WHERE s.storeId = :storeId AND s.domainId = :domainId")
    Optional<Long> findVersionByStoreIdAndDomainId(Long storeId, Long domainId);
}

