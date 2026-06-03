package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.StoreRoleDTO;
import storebackend.dto.StoreRoleRequest;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.StoreRoleService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

/**
 * REST-Controller für Store-Team-Rollen.
 * Endpunkte: /api/stores/{storeId}/roles
 */
@RestController
@RequestMapping("/api/stores/{storeId}/roles")
@Tag(name = "Store Roles", description = "Team & Rollen-Verwaltung für einen Store")
@RequiredArgsConstructor
public class StoreRoleController {

    private final StoreRoleService storeRoleService;
    private final StoreRepository storeRepository;

    /** GET /api/stores/{storeId}/roles – alle Team-Rollen abrufen */
    @GetMapping
    @Operation(summary = "Alle Store-Rollen abrufen")
    public ResponseEntity<?> getRoles(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Store store = storeRepository.findById(storeId)
                .orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        List<StoreRoleDTO> roles = storeRoleService.getRolesForStore(storeId);
        return ResponseEntity.ok(roles);
    }

    /** POST /api/stores/{storeId}/roles – Teammitglied mit Rolle hinzufügen */
    @PostMapping
    @Operation(summary = "Neue Store-Rolle hinzufügen")
    public ResponseEntity<?> addRole(
            @PathVariable Long storeId,
            @RequestBody StoreRoleRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        try {
            StoreRoleDTO saved = storeRoleService.addRole(storeId, request);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /** PUT /api/stores/{storeId}/roles/{userId} – Rolle aktualisieren */
    @PutMapping("/{userId}")
    @Operation(summary = "Store-Rolle aktualisieren")
    public ResponseEntity<?> updateRole(
            @PathVariable Long storeId,
            @PathVariable Long userId,
            @RequestBody StoreRoleRequest request,
            @AuthenticationPrincipal User user) {

        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        try {
            StoreRoleDTO updated = storeRoleService.updateRole(storeId, userId, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /** DELETE /api/stores/{storeId}/roles/{userId} – Teammitglied entfernen */
    @DeleteMapping("/{userId}")
    @Operation(summary = "Store-Rolle entfernen")
    public ResponseEntity<?> removeRole(
            @PathVariable Long storeId,
            @PathVariable Long userId,
            @AuthenticationPrincipal User user) {

        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return ResponseEntity.notFound().build();

        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        storeRoleService.removeRole(storeId, userId);
        return ResponseEntity.noContent().build();
    }
}

