package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.GlobalDeliveryOptionDTO;
import storebackend.entity.User;
import storebackend.service.GlobalDeliveryOptionService;

import java.util.List;
import java.util.Map;

/**
 * Admin-only controller for managing platform-wide global delivery options.
 * These options are shown automatically in every store's checkout – no per-store
 * configuration needed. Only authenticated platform admins can modify them.
 *
 * Base URL: /api/admin/delivery-options
 */
@RestController
@RequestMapping("/api/admin/delivery-options")
@Tag(name = "Admin – Global Delivery Options", description = "Platform-wide delivery options managed by the platform owner")
@RequiredArgsConstructor
@Slf4j
public class AdminDeliveryController {

    private final GlobalDeliveryOptionService service;

    @GetMapping
    @Operation(summary = "List all delivery options (incl. inactive)")
    public ResponseEntity<List<GlobalDeliveryOptionDTO>> getAll(
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(service.getAllOptions());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single delivery option")
    public ResponseEntity<GlobalDeliveryOptionDTO> getOne(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(service.getOption(id));
    }

    @PostMapping
    @Operation(summary = "Create a new global delivery option")
    public ResponseEntity<GlobalDeliveryOptionDTO> create(
            @Valid @RequestBody GlobalDeliveryOptionDTO dto,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        log.info("📦 Admin {} creating delivery option: {}", user.getEmail(), dto.getName());
        return ResponseEntity.ok(service.createOption(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing global delivery option")
    public ResponseEntity<GlobalDeliveryOptionDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody GlobalDeliveryOptionDTO dto,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        log.info("✏️ Admin {} updating delivery option id={}", user.getEmail(), id);
        return ResponseEntity.ok(service.updateOption(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a global delivery option")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        log.info("🗑️ Admin {} deleting delivery option id={}", user.getEmail(), id);
        service.deleteOption(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Logo hochladen", description = "Logo für Lieferoption dauerhaft in MinIO speichern (max. 5 MB)")
    public ResponseEntity<?> uploadLogo(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        try {
            String logoUrl = service.uploadLogo(id, file);
            return ResponseEntity.ok(Map.of("logoUrl", logoUrl, "message", "Logo erfolgreich hochgeladen"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Logo-Upload Fehler für Option {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("message", "Logo-Upload fehlgeschlagen"));
        }
    }
}
