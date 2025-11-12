package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Category;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByStoreIdOrderBySortOrderAsc(Long storeId);
    List<Category> findByStoreIdAndParentIsNullOrderBySortOrderAsc(Long storeId);
    List<Category> findByParentIdOrderBySortOrderAsc(Long parentId);
    Optional<Category> findBySlug(String slug);
    boolean existsByStoreIdAndSlug(Long storeId, String slug);
}

