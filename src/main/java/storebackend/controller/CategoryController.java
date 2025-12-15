package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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

// Fixed: Use @AuthenticationPrincipal User instead of UserDetails - 2025-12-11
@RestController
@RequestMapping("/api/stores/{storeId}/categories")
@Tag(name = "Categories", description = "Category management APIs - Categories can have products assigned to them")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;
    private final StoreService storeService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Get all categories", description = "Returns all categories for a store")
    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories(
            @Parameter(description = "Store ID") @PathVariable Long storeId) {
        return ResponseEntity.ok(categoryService.getCategoriesByStore(storeId));
    }

    @Operation(summary = "Get root categories", description = "Returns only top-level categories (no parent)")
    @GetMapping("/root")
    public ResponseEntity<List<Category>> getRootCategories(
            @Parameter(description = "Store ID") @PathVariable Long storeId) {
        return ResponseEntity.ok(categoryService.getRootCategories(storeId));
    }

    @Operation(summary = "Get subcategories", description = "Returns child categories of a parent category")
    @GetMapping("/{categoryId}/subcategories")
    public ResponseEntity<List<Category>> getSubCategories(
            @Parameter(description = "Category ID") @PathVariable Long categoryId) {
        return ResponseEntity.ok(categoryService.getSubCategories(categoryId));
    }

    @Operation(summary = "Create category", description = "Creates a new category that can contain products")
    @PostMapping
    public ResponseEntity<Category> createCategory(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
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

    @Operation(summary = "Update category", description = "Updates an existing category")
    @PutMapping("/{categoryId}")
    public ResponseEntity<Category> updateCategory(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Category ID") @PathVariable Long categoryId,
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

    @Operation(summary = "Delete category", description = "Deletes a category (products will have category_id set to null)")
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Category ID") @PathVariable Long categoryId,
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
