package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.FaqItem;

import java.util.List;

@Repository
public interface FaqItemRepository extends JpaRepository<FaqItem, Long> {
    List<FaqItem> findByCategoryIdAndIsActiveTrueOrderByDisplayOrderAsc(Long categoryId);

    List<FaqItem> findByStoreIdAndIsActiveTrueOrderByDisplayOrderAsc(Long storeId);

    @Query("SELECT f FROM FaqItem f WHERE f.isActive = true " +
           "AND (f.store.id = :storeId OR f.store IS NULL) " +
           "AND (LOWER(f.question) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(f.answer) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(f.keywords) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY f.viewCount DESC")
    List<FaqItem> searchByKeyword(@Param("storeId") Long storeId, @Param("keyword") String keyword);

    List<FaqItem> findByLanguageAndIsActiveTrueOrderByViewCountDesc(String language);
}

