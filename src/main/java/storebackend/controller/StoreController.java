package storebackend.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateStoreRequest;
import storebackend.dto.StoreDTO;
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
