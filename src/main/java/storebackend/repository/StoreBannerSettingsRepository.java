package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreBannerSettings;

import java.util.Optional;

@Repository
public interface StoreBannerSettingsRepository extends JpaRepository<StoreBannerSettings, Long> {
    Optional<StoreBannerSettings> findByStoreId(Long storeId);
}

