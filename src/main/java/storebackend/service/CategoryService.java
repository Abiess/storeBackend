package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Category;
import storebackend.repository.CategoryRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<Category> getCategoriesByStore(Long storeId) {
        return categoryRepository.findByStoreIdOrderBySortOrderAsc(storeId);
    }

    @Transactional(readOnly = true)
    public List<Category> getRootCategories(Long storeId) {
        return categoryRepository.findByStoreIdAndParentIsNullOrderBySortOrderAsc(storeId);
    }

    @Transactional(readOnly = true)
    public List<Category> getSubCategories(Long parentId) {
        return categoryRepository.findByParentIdOrderBySortOrderAsc(parentId);
    }

    @Transactional
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long id, Category category) {
        Category existing = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        existing.setName(category.getName());
        existing.setSlug(category.getSlug());
        existing.setDescription(category.getDescription());
        existing.setSortOrder(category.getSortOrder());
        existing.setParent(category.getParent());
        return categoryRepository.save(existing);
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }
}

