package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.FaqCategory;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaqCategoryRepository extends JpaRepository<FaqCategory, Long> {
    List<FaqCategory> findByStoreIdAndIsActiveTrueOrderByDisplayOrderAsc(Long storeId);

    List<FaqCategory> findByStoreIdIsNullAndIsActiveTrueOrderByDisplayOrderAsc();

    List<FaqCategory> findAllByOrderByDisplayOrderAsc();

    Optional<FaqCategory> findBySlugAndStoreId(String slug, Long storeId);

    Optional<FaqCategory> findBySlugAndStoreIdIsNull(String slug);
}

