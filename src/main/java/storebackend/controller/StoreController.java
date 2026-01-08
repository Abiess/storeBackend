package storebackend.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateStoreRequest;
import storebackend.dto.StoreDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.service.StoreService;

import java.util.List;

@RestController
@RequestMapping("/api/me/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping
    public ResponseEntity<List<StoreDTO>> getMyStores(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(storeService.getStoresByOwner(user));
    }

    @PostMapping
    public ResponseEntity<StoreDTO> createStore(
            @Valid @RequestBody CreateStoreRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(storeService.createStore(request, user));
    }

    @GetMapping("/check-slug/{slug}")
    public ResponseEntity<Boolean> checkSlugAvailability(@PathVariable String slug) {
        boolean available = storeService.isSlugAvailable(slug);
        return ResponseEntity.ok(available);
    }
}

// New controller for store management operations
@RestController
@RequestMapping("/api/stores")
class StoreManagementController {

    private final StoreService storeService;

    StoreManagementController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping("/{storeId}")
    public ResponseEntity<StoreDTO> getStoreById(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        Store store = storeService.getStoreById(storeId);

        // Verify ownership
        if (!store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        StoreDTO dto = new StoreDTO();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setSlug(store.getSlug());
        dto.setStatus(store.getStatus());
        dto.setDescription(store.getDescription());
        dto.setCreatedAt(store.getCreatedAt());

        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{storeId}")
    public ResponseEntity<StoreDTO> updateStore(
            @PathVariable Long storeId,
            @Valid @RequestBody CreateStoreRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(storeService.updateStore(storeId, request, user));
    }

    @DeleteMapping("/{storeId}")
    public ResponseEntity<Void> deleteStore(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        storeService.deleteStore(storeId, user);
        return ResponseEntity.ok().build();
    }
}
