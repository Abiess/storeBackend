package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Category;
import storebackend.repository.CategoryRepository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

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

    @Transactional(readOnly = true)
    public Category getCategoryById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));
    }

    @Transactional
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Transactional
    public Category createCategory(Category category, Long parentId) {
        category.setParent(resolveParent(category.getStore().getId(), category.getId(), parentId));
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long storeId, Long id, Category category, Long parentId) {
        Category existing = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        if (!existing.getStore().getId().equals(storeId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        existing.setName(category.getName());
        existing.setSlug(category.getSlug());
        existing.setDescription(category.getDescription());
        existing.setSortOrder(category.getSortOrder());
        existing.setParent(resolveParent(storeId, id, parentId));
        existing.setImageUrl(category.getImageUrl());
        return categoryRepository.save(existing);
    }

    private Category resolveParent(Long storeId, Long categoryId, Long parentId) {
        if (parentId == null) return null;
        Category parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent category not found"));
        if (!parent.getStore().getId().equals(storeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent belongs to another store");
        }
        for (Category ancestor = parent; ancestor != null; ancestor = ancestor.getParent()) {
            if (ancestor.getId().equals(categoryId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category hierarchy contains a cycle");
            }
        }
        return parent;
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }
}
