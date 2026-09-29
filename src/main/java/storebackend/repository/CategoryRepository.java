package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Category;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByStoreIdOrderBySortOrderAsc(Long storeId);
    List<Category> findByStoreIdAndParentIsNullOrderBySortOrderAsc(Long storeId);
    @Query("select category from Category category where category.parent.id = :parentId order by category.sortOrder asc")
    List<Category> findByParentIdOrderBySortOrderAsc(@Param("parentId") Long parentId);
    Optional<Category> findBySlug(String slug);
    boolean existsByStoreIdAndSlug(Long storeId, String slug);
    
    // WooCommerce Import: Duplikat-Check
    Optional<Category> findByStoreIdAndExternalSourceAndExternalId(Long storeId, String externalSource, String externalId);
}
