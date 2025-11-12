package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.MediaDTO;
import storebackend.dto.StoreUsageDTO;
import storebackend.dto.UploadMediaResponse;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.service.MediaService;
import storebackend.service.StoreUsageService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;
    private final StoreUsageService storeUsageService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    /**
     * Upload media file
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMedia(
            @PathVariable Long storeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false, defaultValue = "PRODUCT_IMAGE") String mediaType,
            @RequestParam(required = false) String altText,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!store.getOwner().getId().equals(user.getId())) {
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
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
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
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!store.getOwner().getId().equals(user.getId())) {
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
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!store.getOwner().getId().equals(user.getId())) {
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
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!store.getOwner().getId().equals(user.getId())) {
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

