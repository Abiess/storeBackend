package storebackend.controller;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.StoreBannerSettingsDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.StoreBannerService;
import storebackend.util.StoreAccessChecker;

/**
 * Admin-Endpunkt für Banner-Konfiguration.
 * GET  /api/stores/{storeId}/banner        → Banner-Settings abrufen
 * PUT  /api/stores/{storeId}/banner        → Banner-Settings aktualisieren
 */
@RestController
@RequestMapping("/api/stores/{storeId}/banner")
@RequiredArgsConstructor
public class StoreBannerController {

    private final StoreBannerService bannerService;
    private final StoreRepository storeRepository;

    @GetMapping
    public ResponseEntity<?> getBanner(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        return ResponseEntity.ok(bannerService.getBanner(storeId));
    }

    @PutMapping
    public ResponseEntity<?> updateBanner(
            @PathVariable Long storeId,
            @RequestBody StoreBannerSettingsDTO dto,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        dto.setStoreId(storeId);
        return ResponseEntity.ok(bannerService.upsertBanner(storeId, dto));
    }
}

