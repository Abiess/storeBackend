package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreTheme;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreThemeRepository extends JpaRepository<StoreTheme, Long> {
    List<StoreTheme> findByStoreId(Long storeId);
    Optional<StoreTheme> findByStoreIdAndIsActive(Long storeId, Boolean isActive);
}

