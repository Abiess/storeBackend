package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SeoSettings;

import java.util.Optional;

@Repository
public interface SeoSettingsRepository extends JpaRepository<SeoSettings, Long> {
    Optional<SeoSettings> findByStoreId(Long storeId);
}

