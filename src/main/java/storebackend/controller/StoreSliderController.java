package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.StoreSliderDTO;
import storebackend.dto.StoreSliderImageDTO;
import storebackend.dto.StoreSliderSettingsDTO;
import storebackend.entity.Media;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.MediaService;
import storebackend.service.StoreSliderService;
import storebackend.util.StoreAccessChecker;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/slider")
@RequiredArgsConstructor
@Tag(name = "Store Slider", description = "Store Slider Management API")
public class StoreSliderController {

    private final StoreSliderService sliderService;
    private final StoreRepository storeRepository;
    private final MediaService mediaService;

    @GetMapping
    @Operation(summary = "Get complete slider (settings + images) for a store")
    public ResponseEntity<StoreSliderDTO> getSlider(@PathVariable Long storeId) {
        return ResponseEntity.ok(sliderService.getSliderByStoreId(storeId));
    }

    @GetMapping("/active")
    @Operation(summary = "Get only active slider images for frontend display")
    public ResponseEntity<List<StoreSliderImageDTO>> getActiveSliderImages(@PathVariable Long storeId) {
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noCache())
                .header("Cache-Control", "no-cache, no-store, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .body(sliderService.getActiveSliderImages(storeId));
    }

    @GetMapping("/gallery")
    @Operation(summary = "Get gallery images for public service website")
    public ResponseEntity<List<StoreSliderImageDTO>> getGalleryImages(@PathVariable Long storeId) {
        return ResponseEntity.ok(sliderService.getGalleryImages(storeId));
    }

    @PostMapping("/gallery/{mediaId}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Add existing media to service website gallery")
    public ResponseEntity<StoreSliderImageDTO> addToGallery(
            @PathVariable Long storeId,
            @PathVariable Long mediaId,
            @RequestParam(required = false, defaultValue = "") String caption,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).build();
        }
        Media media = mediaService.getMediaById(mediaId);
        if (!media.getStore().getId().equals(storeId)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(sliderService.addToGallery(store, media, caption));
    }

    @DeleteMapping("/gallery/{imageId}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Remove image metadata from service website gallery")
    public ResponseEntity<?> removeFromGallery(
            @PathVariable Long storeId,
            @PathVariable Long imageId,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        sliderService.removeFromGallery(store, imageId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/gallery/{imageId}/caption")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update gallery image caption")
    public ResponseEntity<?> updateGalleryCaption(
            @PathVariable Long storeId,
            @PathVariable Long imageId,
            @RequestParam(required = false, defaultValue = "") String caption,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        return ResponseEntity.ok(sliderService.updateGalleryCaption(store, imageId, caption));
    }

    @PutMapping("/gallery/reorder")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Reorder gallery images")
    public ResponseEntity<?> reorderGallery(
            @PathVariable Long storeId,
            @RequestBody Map<String, List<Long>> payload,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        sliderService.reorderGallery(store, payload.get("imageIds"));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/settings")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update slider settings")
    public ResponseEntity<?> updateSettings(
            @PathVariable Long storeId,
            @RequestBody StoreSliderSettingsDTO dto,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        return ResponseEntity.ok(sliderService.updateSettings(storeId, dto));
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Upload owner slider image")
    public ResponseEntity<?> uploadImage(
            @PathVariable Long storeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "altText", required = false) String altText,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        StoreSliderImageDTO result = sliderService.uploadOwnerImage(storeId, file, altText);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/images/{imageId}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update slider image (order, active status, alt text)")
    public ResponseEntity<?> updateImage(
            @PathVariable Long storeId,
            @PathVariable Long imageId,
            @RequestBody StoreSliderImageDTO dto,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        return ResponseEntity.ok(sliderService.updateSliderImage(imageId, dto));
    }

    @PutMapping("/images/reorder")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Reorder slider images")
    public ResponseEntity<?> reorderImages(
            @PathVariable Long storeId,
            @RequestBody Map<String, List<Long>> payload,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        List<Long> imageIds = payload.get("imageIds");
        sliderService.reorderImages(storeId, imageIds);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/images/{imageId}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete slider image")
    public ResponseEntity<?> deleteImage(
            @PathVariable Long storeId,
            @PathVariable Long imageId,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        sliderService.deleteSliderImage(imageId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/initialize")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Initialize slider settings for stores that don't have them yet")
    public ResponseEntity<?> initializeSlider(
            @PathVariable Long storeId,
            @RequestParam(value = "category", defaultValue = "general") String category,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).body("Not authorized");
        }
        return ResponseEntity.ok(sliderService.initializeSliderIfMissing(storeId, category));
    }
}
