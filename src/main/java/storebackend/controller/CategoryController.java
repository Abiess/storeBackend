package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.Category;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.service.CategoryService;
import storebackend.service.StoreService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;
    private final StoreService storeService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories(@PathVariable Long storeId) {
        return ResponseEntity.ok(categoryService.getCategoriesByStore(storeId));
    }

    @GetMapping("/root")
    public ResponseEntity<List<Category>> getRootCategories(@PathVariable Long storeId) {
        return ResponseEntity.ok(categoryService.getRootCategories(storeId));
    }

    @GetMapping("/{categoryId}/subcategories")
    public ResponseEntity<List<Category>> getSubCategories(@PathVariable Long categoryId) {
        return ResponseEntity.ok(categoryService.getSubCategories(categoryId));
    }

    @PostMapping
    public ResponseEntity<Category> createCategory(
            @PathVariable Long storeId,
            @RequestBody Category category,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeService.getStoreById(storeId);

        // Prüfe Berechtigung direkt über Owner-ID
        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        category.setStore(store);
        return ResponseEntity.ok(categoryService.createCategory(category));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<Category> updateCategory(
            @PathVariable Long storeId,
            @PathVariable Long categoryId,
            @RequestBody Category category,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(categoryService.updateCategory(categoryId, category));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable Long storeId,
            @PathVariable Long categoryId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeService.getStoreById(storeId);

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}
