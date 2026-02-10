package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.*;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.*;
import storebackend.util.StoreAccessChecker;

import java.util.List;

/**
 * Controller for delivery management (Merchant APIs)
 */
@RestController
@RequestMapping("/api/stores/{storeId}/delivery")
@Tag(name = "Delivery Management", description = "Merchant APIs for delivery configuration")
@RequiredArgsConstructor
public class DeliveryController {

    private final StoreDeliverySettingsService settingsService;
    private final DeliveryProviderService providerService;
    private final DeliveryZoneService zoneService;
    private final StoreRepository storeRepository;

    // ==================== SETTINGS ====================

    @GetMapping("/settings")
    @Operation(summary = "Get delivery settings", description = "Get store delivery configuration")
    public ResponseEntity<?> getSettings(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(settingsService.getSettings(storeId));
    }

    @PutMapping("/settings")
    @Operation(summary = "Update delivery settings", description = "Update store delivery configuration")
    public ResponseEntity<?> updateSettings(
            @PathVariable Long storeId,
            @Valid @RequestBody StoreDeliverySettingsDTO request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(settingsService.updateSettings(storeId, request));
    }

    // ==================== PROVIDERS ====================

    @GetMapping("/providers")
    @Operation(summary = "Get all providers", description = "List all delivery providers for store")
    public ResponseEntity<?> getProviders(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(providerService.getProvidersByStore(storeId));
    }

    @GetMapping("/providers/{providerId}")
    @Operation(summary = "Get provider details", description = "Get single delivery provider")
    public ResponseEntity<?> getProvider(
            @PathVariable Long storeId,
            @PathVariable Long providerId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(providerService.getProvider(providerId));
    }

    @PostMapping("/providers")
    @Operation(summary = "Create provider", description = "Create new delivery provider")
    public ResponseEntity<?> createProvider(
            @PathVariable Long storeId,
            @Valid @RequestBody DeliveryProviderRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(providerService.createProvider(storeId, request));
    }

    @PutMapping("/providers/{providerId}")
    @Operation(summary = "Update provider", description = "Update delivery provider")
    public ResponseEntity<?> updateProvider(
            @PathVariable Long storeId,
            @PathVariable Long providerId,
            @Valid @RequestBody DeliveryProviderRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(providerService.updateProvider(providerId, request));
    }

    @DeleteMapping("/providers/{providerId}")
    @Operation(summary = "Delete provider", description = "Delete delivery provider")
    public ResponseEntity<?> deleteProvider(
            @PathVariable Long storeId,
            @PathVariable Long providerId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        providerService.deleteProvider(providerId);
        return ResponseEntity.noContent().build();
    }

    // ==================== ZONES ====================

    @GetMapping("/zones")
    @Operation(summary = "Get all zones", description = "List all delivery zones for store")
    public ResponseEntity<?> getZones(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(zoneService.getZonesByStore(storeId));
    }

    @GetMapping("/zones/{zoneId}")
    @Operation(summary = "Get zone details", description = "Get single delivery zone")
    public ResponseEntity<?> getZone(
            @PathVariable Long storeId,
            @PathVariable Long zoneId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(zoneService.getZone(zoneId));
    }

    @PostMapping("/zones")
    @Operation(summary = "Create zone", description = "Create new delivery zone")
    public ResponseEntity<?> createZone(
            @PathVariable Long storeId,
            @Valid @RequestBody DeliveryZoneRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(zoneService.createZone(storeId, request));
    }

    @PutMapping("/zones/{zoneId}")
    @Operation(summary = "Update zone", description = "Update delivery zone")
    public ResponseEntity<?> updateZone(
            @PathVariable Long storeId,
            @PathVariable Long zoneId,
            @Valid @RequestBody DeliveryZoneRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        return ResponseEntity.ok(zoneService.updateZone(zoneId, request));
    }

    @DeleteMapping("/zones/{zoneId}")
    @Operation(summary = "Delete zone", description = "Delete delivery zone")
    public ResponseEntity<?> deleteZone(
            @PathVariable Long storeId,
            @PathVariable Long zoneId,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }

        zoneService.deleteZone(zoneId);
        return ResponseEntity.noContent().build();
    }
}
