package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.MediaDTO;
import storebackend.dto.UploadMediaResponse;
import storebackend.entity.Media;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.MediaType;
import storebackend.repository.MediaRepository;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaService {

    private final MediaRepository mediaRepository;
    private final MinioService minioService;
    private final StoreUsageService storeUsageService;

    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    /**
     * Upload media file
     */
    @Transactional
    public UploadMediaResponse uploadMedia(
            MultipartFile file,
            Store store,
            User owner,
            MediaType mediaType,
            String altText
    ) throws IOException {
        // Validate file
        validateFile(file);

        // Check storage limits
        if (!storeUsageService.hasEnoughStorage(store, owner, file.getSize())) {
            throw new RuntimeException("Storage limit exceeded. Please upgrade your plan.");
        }

        if (!storeUsageService.canUploadImage(store, owner)) {
            throw new RuntimeException("Image count limit exceeded. Please upgrade your plan.");
        }

        // Upload to MinIO
        String folder = mediaType.name().toLowerCase();
        String minioObjectName = minioService.uploadFile(file, store.getId(), folder);

        // Save media record
        Media media = new Media();
        media.setStore(store);
        media.setFilename(file.getOriginalFilename());
        media.setOriginalFilename(file.getOriginalFilename());
        media.setContentType(file.getContentType());
        media.setSizeBytes(file.getSize());
        media.setMinioObjectName(minioObjectName);
        media.setMediaType(mediaType);
        media.setAltText(altText);

        media = mediaRepository.save(media);

        // Update usage
        storeUsageService.incrementStorage(store, file.getSize());
        storeUsageService.incrementImageCount(store);

        // Generate presigned URL
        String url = minioService.getPresignedUrl(minioObjectName, 60); // 60 minutes

        log.info("Media uploaded successfully: {} for store {}", media.getId(), store.getId());

        return new UploadMediaResponse(
                media.getId(),
                media.getFilename(),
                url,
                media.getSizeBytes(),
                media.getContentType(),
                "Media uploaded successfully"
        );
    }

    /**
     * Get all media for a store
     */
    public List<MediaDTO> getMediaByStore(Store store) {
        List<Media> mediaList = mediaRepository.findByStore(store);
        return mediaList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get media by ID
     */
    public Media getMediaById(Long mediaId) {
        return mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found"));
    }

    /**
     * Delete media
     */
    @Transactional
    public void deleteMedia(Long mediaId, Store store) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found"));

        if (!media.getStore().getId().equals(store.getId())) {
            throw new RuntimeException("Not authorized to delete this media");
        }

        // Delete from MinIO
        minioService.deleteFile(media.getMinioObjectName());

        // Update usage
        storeUsageService.decrementStorage(store, media.getSizeBytes());
        storeUsageService.decrementImageCount(store);

        // Delete record
        mediaRepository.delete(media);

        log.info("Media deleted successfully: {} for store {}", mediaId, store.getId());
    }

    /**
     * Get media URL
     */
    public String getMediaUrl(Long mediaId) {
        Media media = getMediaById(mediaId);
        return minioService.getPresignedUrl(media.getMinioObjectName(), 60);
    }

    /**
     * Validate file
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds maximum allowed size of 10 MB");
        }

        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            throw new RuntimeException("Invalid file type. Allowed types: JPEG, PNG, GIF, WEBP");
        }
    }

    /**
     * Convert Media entity to DTO
     */
    private MediaDTO convertToDTO(Media media) {
        MediaDTO dto = new MediaDTO();
        dto.setId(media.getId());
        dto.setStoreId(media.getStore().getId());
        dto.setFilename(media.getFilename());
        dto.setOriginalFilename(media.getOriginalFilename());
        dto.setContentType(media.getContentType());
        dto.setSizeBytes(media.getSizeBytes());
        dto.setMediaType(media.getMediaType().name());
        dto.setAltText(media.getAltText());
        dto.setUrl(minioService.getPresignedUrl(media.getMinioObjectName(), 60));
        dto.setCreatedAt(media.getCreatedAt());
        return dto;
    }
}

