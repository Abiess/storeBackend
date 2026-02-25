package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.FaqCategoryDTO;
import storebackend.dto.FaqItemDTO;
import storebackend.entity.User;
import storebackend.service.FaqService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/faq")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('STORE_MANAGER', 'STORE_OWNER')")
public class FaqManagementController {

    private final FaqService faqService;

    @GetMapping("/categories")
    public ResponseEntity<List<FaqCategoryDTO>> getCategories(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        log.info("Getting FAQ categories for store {}", storeId);

        try {
            List<FaqCategoryDTO> categories = faqService.getCategories(storeId);
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            log.error("Error getting FAQ categories", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/categories/{categoryId}/items")
    public ResponseEntity<List<FaqItemDTO>> getFaqsByCategory(
            @PathVariable Long storeId,
            @PathVariable Long categoryId,
            @AuthenticationPrincipal User user) {
        log.info("Getting FAQ items for category {} store {}", categoryId, storeId);

        try {
            List<FaqItemDTO> items = faqService.getFaqsByCategory(categoryId, storeId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            log.error("Error getting FAQ items", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<FaqItemDTO>> searchFaq(
            @PathVariable Long storeId,
            @RequestParam String q,
            @AuthenticationPrincipal User user) {
        log.info("Searching FAQ with keyword: {} for store {}", q, storeId);

        try {
            List<FaqItemDTO> results = faqService.searchFaq(storeId, q);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("Error searching FAQ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/items")
    public ResponseEntity<FaqItemDTO> createFaqItem(
            @PathVariable Long storeId,
            @RequestBody FaqItemDTO request,
            @AuthenticationPrincipal User user) {
        log.info("Creating FAQ item for store {}", storeId);

        try {
            FaqItemDTO created = faqService.createFaqItem(storeId, request);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.error("Error creating FAQ item", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/items/{faqId}")
    public ResponseEntity<FaqItemDTO> updateFaqItem(
            @PathVariable Long storeId,
            @PathVariable Long faqId,
            @RequestBody FaqItemDTO request,
            @AuthenticationPrincipal User user) {
        log.info("Updating FAQ item {} for store {}", faqId, storeId);

        try {
            FaqItemDTO updated = faqService.updateFaqItem(faqId, storeId, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating FAQ item", e);
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error updating FAQ item", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/items/{faqId}")
    public ResponseEntity<Map<String, String>> deleteFaqItem(
            @PathVariable Long storeId,
            @PathVariable Long faqId,
            @AuthenticationPrincipal User user) {
        log.info("Deleting FAQ item {} for store {}", faqId, storeId);

        try {
            faqService.deleteFaqItem(faqId, storeId);
            return ResponseEntity.ok(Map.of("message", "FAQ erfolgreich gelöscht"));
        } catch (RuntimeException e) {
            log.error("Error deleting FAQ item", e);
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting FAQ item", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

