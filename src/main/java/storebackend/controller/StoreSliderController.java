package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.StoreSliderDTO;
import storebackend.dto.StoreSliderImageDTO;
import storebackend.dto.StoreSliderSettingsDTO;
import storebackend.service.StoreSliderService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/slider")
@RequiredArgsConstructor
@Tag(name = "Store Slider", description = "Store Slider Management API")
public class StoreSliderController {

    private final StoreSliderService sliderService;

    @GetMapping
    @Operation(summary = "Get complete slider (settings + images) for a store")
    public ResponseEntity<StoreSliderDTO> getSlider(@PathVariable Long storeId) {
        return ResponseEntity.ok(sliderService.getSliderByStoreId(storeId));
    }

    @GetMapping("/active")
    @Operation(summary = "Get only active slider images for frontend display")
    public ResponseEntity<List<StoreSliderImageDTO>> getActiveSliderImages(@PathVariable Long storeId) {
        return ResponseEntity.ok(sliderService.getActiveSliderImages(storeId));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update slider settings")
    public ResponseEntity<StoreSliderSettingsDTO> updateSettings(
            @PathVariable Long storeId,
            @RequestBody StoreSliderSettingsDTO dto) {
        return ResponseEntity.ok(sliderService.updateSettings(storeId, dto));
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Upload owner slider image")
    public ResponseEntity<StoreSliderImageDTO> uploadImage(
            @PathVariable Long storeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "altText", required = false) String altText) {
        StoreSliderImageDTO dto = sliderService.uploadOwnerImage(storeId, file, altText);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/images/{imageId}")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update slider image (order, active status, alt text)")
    public ResponseEntity<StoreSliderImageDTO> updateImage(
            @PathVariable Long storeId,
            @PathVariable Long imageId,
            @RequestBody StoreSliderImageDTO dto) {
        return ResponseEntity.ok(sliderService.updateSliderImage(imageId, dto));
    }

    @PutMapping("/images/reorder")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Reorder slider images")
    public ResponseEntity<Void> reorderImages(
            @PathVariable Long storeId,
            @RequestBody Map<String, List<Long>> payload) {
        List<Long> imageIds = payload.get("imageIds");
        sliderService.reorderImages(storeId, imageIds);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/images/{imageId}")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete slider image")
    public ResponseEntity<Void> deleteImage(
            @PathVariable Long storeId,
            @PathVariable Long imageId) {
        sliderService.deleteSliderImage(imageId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/initialize")
    @PreAuthorize("hasRole('STORE_OWNER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Initialize slider settings for stores that don't have them yet")
    public ResponseEntity<StoreSliderDTO> initializeSlider(
            @PathVariable Long storeId,
            @RequestParam(value = "category", defaultValue = "general") String category) {
        return ResponseEntity.ok(sliderService.initializeSliderIfMissing(storeId, category));
    }
}
