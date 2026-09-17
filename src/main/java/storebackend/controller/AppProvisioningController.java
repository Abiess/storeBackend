package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.admin.AdminStoreSummaryDTO;
import storebackend.dto.admin.AdminUserEntitlementsDTO;
import storebackend.dto.admin.AdminUserSummaryDTO;
import storebackend.dto.admin.AdminEntitlementDTO;
import storebackend.dto.admin.PatchEntitlementRequest;
import storebackend.dto.admin.UpsertEntitlementRequest;
import storebackend.entity.User;
import storebackend.service.admin.AppProvisioningService;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * App Provisioning Phase 1 (Platform Administration).
 *
 * Ermöglicht einem bestehenden {@code ROLE_PLATFORM_ADMIN}, App-Entitlements
 * ({@code UserAppEntitlement}) für Benutzer ohne direktes SQL zu verwalten
 * (siehe Audit + Umsetzungsplan in ARCHITECTURE_APP_FACTORY.md, Abschnitt
 * 14/15).
 *
 * Bewusst NICHT angefasst: {@code AppAccessChecker}, {@code
 * AppAccessInterceptor}, {@code @RequiresApp} - dieser Controller befüllt
 * ausschließlich die Tabelle, die diese Klassen bereits korrekt LESEN.
 *
 * Sicherheit: ausschließlich die bestehende Rolle {@code ROLE_PLATFORM_ADMIN}
 * (kein neues Auth-/Rollen-Konzept), analog zu {@code DhlAdminController}/
 * {@code CommissionController}.
 */
@RestController
@RequestMapping("/api/admin/app-provisioning")
@Tag(name = "Admin – App Provisioning", description = "Platform-Admin-Verwaltung von App-Entitlements (Phase 1)")
@RequiredArgsConstructor
@Slf4j
public class AppProvisioningController {

    private final AppProvisioningService appProvisioningService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    @Operation(summary = "Benutzer suchen (E-Mail/Name), inkl. aktuellem AppAccessMode")
    public ResponseEntity<List<AdminUserSummaryDTO>> searchUsers(
            @RequestParam(value = "query", required = false, defaultValue = "") String query,
            @AuthenticationPrincipal User admin) {
        log.info("🛠️ Platform-Admin {} sucht Benutzer (query='{}')", admin != null ? admin.getEmail() : "?", query);
        return ResponseEntity.ok(appProvisioningService.searchUsers(query));
    }

    @GetMapping("/users/{userId}/entitlements")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    @Operation(summary = "Alle Entitlements eines Users (inkl. enabled=false) + aktueller AppAccessMode")
    public ResponseEntity<?> getUserEntitlements(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(appProvisioningService.getUserEntitlements(userId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(e.getMessage()));
        }
    }

    @PutMapping("/users/{userId}/entitlements")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    @Operation(summary = "Entitlement anlegen/aktualisieren (Upsert) - STORE-Apps benötigen storeId, GLOBAL-Apps dürfen keine haben")
    public ResponseEntity<?> upsertEntitlement(
            @PathVariable Long userId,
            @Valid @RequestBody UpsertEntitlementRequest request,
            @AuthenticationPrincipal User admin) {
        try {
            AdminEntitlementDTO result = appProvisioningService.upsertEntitlement(userId, request);
            log.info("🛠️ Platform-Admin {} setzt Entitlement User={} App={} Store={} enabled={}",
                    admin != null ? admin.getEmail() : "?", userId, request.getApp(), request.getStoreId(), request.isEnabled());
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(e.getMessage()));
        }
    }

    @PatchMapping("/users/{userId}/entitlements/{entitlementId}")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    @Operation(summary = "Entitlement Soft-Disable/-Enable (nur enabled-Flag, kein physisches DELETE)")
    public ResponseEntity<?> patchEntitlement(
            @PathVariable Long userId,
            @PathVariable Long entitlementId,
            @Valid @RequestBody PatchEntitlementRequest request,
            @AuthenticationPrincipal User admin) {
        try {
            AdminEntitlementDTO result = appProvisioningService.patchEnabled(userId, entitlementId, request.isEnabled());
            log.info("🛠️ Platform-Admin {} setzt Entitlement #{} (User={}) enabled={}",
                    admin != null ? admin.getEmail() : "?", entitlementId, userId, request.isEnabled());
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(e.getMessage()));
        }
    }

    @GetMapping("/stores")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    @Operation(summary = "Stores für die Context-Auswahl (STORE-scoped Apps) suchen")
    public ResponseEntity<List<AdminStoreSummaryDTO>> searchStores(
            @RequestParam(value = "query", required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(appProvisioningService.searchStores(query));
    }

    private java.util.Map<String, Object> errorBody(String message) {
        return java.util.Map.of("error", message != null ? message : "Fehler");
    }
}
