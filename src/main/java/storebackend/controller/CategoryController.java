package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import storebackend.util.StoreAccessChecker;

import java.util.List;

// Fixed: Use @AuthenticationPrincipal User instead of UserDetails - 2025-12-11
@RestController
@RequestMapping("/api/stores/{storeId}/categories")
@Tag(name = "Categories", description = "Category management APIs - Categories can have products assigned to them")
@RequiredArgsConstructor
@Slf4j
public class CategoryController {
    private final CategoryService categoryService;
    private final StoreService storeService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    /**
     * Prüft, ob der Benutzer Zugriff auf den Store hat
     */
    private boolean hasStoreAccess(Long storeId, User user) {
        if (user == null) {
            return false;
        }

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return false;
        }

        // Owner hat immer Zugriff
        if (StoreAccessChecker.isOwner(store, user)) {
            return true;
        }

        // Prüfe, ob der User über StoreService Zugriff hat
        try {
            List<Store> userStores = storeService.getStoresByUserId(user.getId());
            return userStores.stream().anyMatch(s -> s.getId().equals(storeId));
        } catch (Exception e) {
            return false;
        }
    }

    @Operation(summary = "Get all categories", description = "Returns all categories for a store (public access)")
    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        // GET-Requests auf Kategorien sind öffentlich für Storefront
        log.info("Getting categories for store {} (user: {})", storeId, user != null ? user.getId() : "anonymous");

        return ResponseEntity.ok(categoryService.getCategoriesByStore(storeId));
    }

    @Operation(summary = "Get root categories", description = "Returns only top-level categories (public access)")
    @GetMapping("/root")
    public ResponseEntity<List<Category>> getRootCategories(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        // GET-Requests auf Root-Kategorien sind öffentlich für Storefront
        log.info("Getting root categories for store {} (user: {})", storeId, user != null ? user.getId() : "anonymous");

        return ResponseEntity.ok(categoryService.getRootCategories(storeId));
    }

    @Operation(summary = "Get subcategories", description = "Returns child categories of a parent category")
    @GetMapping("/{categoryId}/subcategories")
    public ResponseEntity<List<Category>> getSubCategories(
            @Parameter(description = "Category ID") @PathVariable Long categoryId) {
        return ResponseEntity.ok(categoryService.getSubCategories(categoryId));
    }

    @Operation(summary = "Get category by ID", description = "Returns a single category by ID (public access)")
    @GetMapping("/{categoryId}")
    public ResponseEntity<Category> getCategoryById(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Category ID") @PathVariable Long categoryId,
            @AuthenticationPrincipal User user) {

        log.info("Getting category {} for store {} (user: {})", categoryId, storeId, user != null ? user.getId() : "anonymous");

        try {
            Category category = categoryService.getCategoryById(categoryId);

            // Prüfe ob Kategorie zum Store gehört
            if (!category.getStore().getId().equals(storeId)) {
                log.warn("Category {} does not belong to store {}", categoryId, storeId);
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(category);
        } catch (Exception e) {
            log.error("Error getting category {}: {}", categoryId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
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

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        Store store = storeService.getStoreById(storeId);
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

        if (!hasStoreAccess(storeId, user)) {
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

        if (!hasStoreAccess(storeId, user)) {
            return ResponseEntity.status(403).build();
        }

        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}
