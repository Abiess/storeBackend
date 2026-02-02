package storebackend.repository;



import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreSliderSettings;

import java.util.Optional;

@Repository
public interface StoreSliderSettingsRepository extends JpaRepository<StoreSliderSettings, Long> {
    Optional<StoreSliderSettings> findByStoreId(Long storeId);
    void deleteByStoreId(Long storeId);
}

