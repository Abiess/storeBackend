package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateHomepageSectionRequest;
import storebackend.dto.HomepageSectionDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.HomepageSectionService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/homepage-sections")
@Tag(name = "Homepage Sections", description = "Homepage builder section management")
@RequiredArgsConstructor
public class HomepageSectionController {

    private final HomepageSectionService sectionService;
    private final StoreRepository storeRepository;

    /**
     * Get all sections for a store (admin)
     */
    @GetMapping
    public ResponseEntity<?> getStoreSections(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            List<HomepageSectionDTO> sections = sectionService.getStoreSections(storeId);
            return ResponseEntity.ok(sections);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get active sections (public - for storefront)
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveSections(@PathVariable Long storeId) {
        try {
            List<HomepageSectionDTO> sections = sectionService.getActiveSections(storeId);
            return ResponseEntity.ok(sections);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Create new section
     */
    @PostMapping
    public ResponseEntity<?> createSection(
            @PathVariable Long storeId,
            @RequestBody CreateHomepageSectionRequest request,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            request.setStoreId(storeId);
            HomepageSectionDTO section = sectionService.createSection(request);
            return ResponseEntity.ok(section);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update section
     */
    @PutMapping("/{sectionId}")
    public ResponseEntity<?> updateSection(
            @PathVariable Long storeId,
            @PathVariable Long sectionId,
            @RequestBody HomepageSectionDTO updates,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            HomepageSectionDTO section = sectionService.updateSection(sectionId, updates);
            return ResponseEntity.ok(section);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete section
     */
    @DeleteMapping("/{sectionId}")
    public ResponseEntity<?> deleteSection(
            @PathVariable Long storeId,
            @PathVariable Long sectionId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            sectionService.deleteSection(sectionId);
            return ResponseEntity.ok("Section deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Reorder sections
     */
    @Operation(summary = "Reorder sections", description = "Update sort order of multiple sections at once")
    @PutMapping("/reorder")
    public ResponseEntity<?> reorderSections(
            @PathVariable Long storeId,
            @RequestBody List<Long> sectionIds,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            sectionService.reorderSections(storeId, sectionIds);
            return ResponseEntity.ok("Sections reordered successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

