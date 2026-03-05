package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.HomepageSection;

import java.util.List;

@Repository
public interface HomepageSectionRepository extends JpaRepository<HomepageSection, Long> {
    List<HomepageSection> findByStoreIdOrderBySortOrderAsc(Long storeId);
    List<HomepageSection> findByStoreIdAndIsActiveOrderBySortOrderAsc(Long storeId, Boolean isActive);
}

