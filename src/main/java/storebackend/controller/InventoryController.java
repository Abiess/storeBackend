package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.InventoryLog;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.InventoryService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;
    private final StoreRepository storeRepository;

    @GetMapping("/inventory/logs")
    public ResponseEntity<List<InventoryLog>> getAllInventoryLogs(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(inventoryService.getInventoryLogsByStore(storeId));
    }

    @GetMapping("/products/{productId}/variants/{variantId}/inventory/logs")
    public ResponseEntity<List<InventoryLog>> getVariantInventoryLogs(
            @PathVariable Long storeId,
            @PathVariable Long variantId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(inventoryService.getInventoryLogsByVariant(variantId));
    }

    @PostMapping("/products/{productId}/variants/{variantId}/inventory/adjust")
    public ResponseEntity<Map<String, Object>> adjustInventory(
            @PathVariable Long storeId,
            @PathVariable Long variantId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        Integer quantityChange = Integer.valueOf(request.get("quantityChange").toString());
        String reason = (String) request.get("reason");
        String notes = (String) request.get("notes");

        try {
            InventoryLog log = inventoryService.adjustInventory(variantId, quantityChange, reason, notes, user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("log", log);
            response.put("message", "Inventory adjusted successfully");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
