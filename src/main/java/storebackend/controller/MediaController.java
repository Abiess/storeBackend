package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.MediaDTO;
import storebackend.dto.StoreUsageDTO;
import storebackend.dto.UploadMediaResponse;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.service.MediaService;
import storebackend.service.StoreUsageService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/media")
@Tag(name = "Media", description = "Media upload and management APIs - Upload images to MinIO")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;
    private final StoreUsageService storeUsageService;
    private final StoreRepository storeRepository;

    /**
     * Upload media file
     */
    @Operation(
            summary = "Upload media file",
            description = "Upload an image or video to MinIO storage. Supported types: PRODUCT_IMAGE, LOGO, BANNER"
    )
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMedia(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Media file to upload", required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE))
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Media type (PRODUCT_IMAGE, LOGO, BANNER)")
            @RequestParam(required = false, defaultValue = "PRODUCT_IMAGE") String mediaType,
            @Parameter(description = "Alternative text for accessibility")
            @RequestParam(required = false) String altText,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized to upload media to this store");
            }
            storebackend.enums.MediaType type = storebackend.enums.MediaType.valueOf(mediaType);
            UploadMediaResponse response = mediaService.uploadMedia(file, store, user, type, altText);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all media for a store
     */
    @GetMapping
    public ResponseEntity<List<MediaDTO>> getMedia(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        if (!StoreAccessChecker.isOwner(store, user)) {
            return ResponseEntity.status(403).build();
        }
        List<MediaDTO> media = mediaService.getMediaByStore(store);
        return ResponseEntity.ok(media);
    }

    /**
     * Get media URL
     */
    @GetMapping("/{mediaId}/url")
    public ResponseEntity<?> getMediaUrl(
            @PathVariable Long storeId,
            @PathVariable Long mediaId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }
            String url = mediaService.getMediaUrl(mediaId);
            return ResponseEntity.ok().body(new MediaUrlResponse(url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Delete media
     */
    @DeleteMapping("/{mediaId}")
    public ResponseEntity<?> deleteMedia(
            @PathVariable Long storeId,
            @PathVariable Long mediaId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }
            mediaService.deleteMedia(mediaId, store);
            return ResponseEntity.ok().body("Media deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get store usage statistics
     */
    @GetMapping("/usage")
    public ResponseEntity<?> getStoreUsage(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }
            StoreUsageDTO usage = storeUsageService.getStoreUsageDTO(store, user);
            return ResponseEntity.ok(usage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Helper class for URL response
    record MediaUrlResponse(String url) {}
}
