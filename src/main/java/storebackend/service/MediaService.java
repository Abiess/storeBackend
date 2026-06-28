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
import storebackend.repository.StoreRepository;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaService {

    private final MediaRepository mediaRepository;
    private final MinioService minioService;
    private final StoreUsageService storeUsageService;
    private final StoreRepository storeRepository;

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

        // Save media record (NO presigned URL in DB - they expire!)
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

        // ✅ WICHTIG: Wenn LOGO oder STORE_LOGO hochgeladen wird, aktualisiere store.logoUrl
        if (mediaType == MediaType.LOGO || mediaType == MediaType.STORE_LOGO) {
            // Permanente öffentliche URL – kein Ablaufdatum (Bucket ist public-read)
            String logoUrl = minioService.getPublicUrl(minioObjectName);
            store.setLogoUrl(logoUrl);
            storeRepository.save(store);
            log.info("✅ Store logo updated (permanent URL) for store {}: {}", store.getId(), logoUrl);
        }

        // Update usage
        storeUsageService.incrementStorage(store, file.getSize());
        storeUsageService.incrementImageCount(store);

        // Generate URL for response
        // ✅ FÜR LOGOS: Permanente öffentliche URL (kein Ablaufdatum)
        // ✅ FÜR ANDERE MEDIEN: Presigned URL (7 Tage)
        String url;
        if (mediaType == MediaType.LOGO || mediaType == MediaType.STORE_LOGO) {
            url = minioService.getPublicUrl(minioObjectName); // Permanent, kein Expiry
            log.info("✅ Logo returned with permanent URL (no expiry): {}", url);
        } else {
            url = minioService.getPresignedUrl(minioObjectName, 10080); // 7 Tage für andere Medien
        }

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
        return minioService.getPresignedUrl(media.getMinioObjectName(), 10080); // 7 Tage
    }

    /**
     * Lädt ein Bild von einer URL herunter und speichert es in MinIO + DB.
     * Wird für den Telegram-Channel-Import verwendet.
     *
     * @param store    Ziel-Store
     * @param imageUrl Öffentliche Download-URL (z.B. von Telegram CDN)
     * @param altText  Alt-Text für das Bild
     * @return gespeichertes Media-Entity
     */
    @Transactional
    public Media uploadFromUrl(Store store, String imageUrl, String altText) throws IOException {
        log.info("[MediaService] uploadFromUrl: store={}, url={}", store.getId(), imageUrl);

        URL url = new URL(imageUrl);
        URLConnection conn = url.openConnection();
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(30_000);
        conn.setRequestProperty("User-Agent", "markt.ma/1.0");

        String contentType = conn.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            contentType = "image/jpeg"; // Fallback
        }

        String ext = contentType.replace("image/", "").replace("jpeg", "jpg");
        String filename = "telegram_" + UUID.randomUUID() + "." + ext;

        try (InputStream inputStream = conn.getInputStream()) {
            byte[] data = inputStream.readAllBytes();
            long sizeBytes = data.length;

            // Upload zu MinIO via vorhandenem uploadTemporaryFile-Muster
            String objectName = "stores/" + store.getId() + "/telegram/" + filename;
            try (InputStream uploadStream = new java.io.ByteArrayInputStream(data)) {
                minioService.uploadInputStream(uploadStream, sizeBytes, contentType, objectName);
            }

            // Media-Entity speichern
            Media media = new Media();
            media.setStore(store);
            media.setFilename(filename);
            media.setOriginalFilename(filename);
            media.setContentType(contentType);
            media.setSizeBytes(sizeBytes);
            media.setMinioObjectName(objectName);
            media.setMediaType(storebackend.enums.MediaType.PRODUCT_IMAGE);
            media.setAltText(altText);

            media = mediaRepository.save(media);

            // Usage aktualisieren
            storeUsageService.incrementStorage(store, sizeBytes);
            storeUsageService.incrementImageCount(store);

            log.info("[MediaService] uploadFromUrl ✅ mediaId={} für store={}", media.getId(), store.getId());
            return media;
        }
    }

    /**
     * Speichert ein Bild aus Base64-String (vom Telegram MTProto Scraper).
     * Wird beim Channel-Import verwendet.
     */
    @Transactional
    public Media uploadFromBase64(Store store, String base64Data, String altText) throws IOException {
        byte[] data = Base64.getDecoder().decode(base64Data);
        long sizeBytes = data.length;

        // Inhalt prüfen (Magic Bytes)
        String contentType = detectContentType(data);
        String ext = contentType.replace("image/", "").replace("jpeg", "jpg");
        String filename = "telegram_" + UUID.randomUUID() + "." + ext;
        String objectName = "stores/" + store.getId() + "/telegram/" + filename;

        try (InputStream uploadStream = new java.io.ByteArrayInputStream(data)) {
            minioService.uploadInputStream(uploadStream, sizeBytes, contentType, objectName);
        }

        Media media = new Media();
        media.setStore(store);
        media.setFilename(filename);
        media.setOriginalFilename(filename);
        media.setContentType(contentType);
        media.setSizeBytes(sizeBytes);
        media.setMinioObjectName(objectName);
        media.setMediaType(storebackend.enums.MediaType.PRODUCT_IMAGE);
        media.setAltText(altText);

        media = mediaRepository.save(media);
        storeUsageService.incrementStorage(store, sizeBytes);
        storeUsageService.incrementImageCount(store);

        log.info("[MediaService] uploadFromBase64 ✅ mediaId={} voor store={}", media.getId(), store.getId());
        return media;
    }

    /** Erkennt Bild-Content-Type anhand der Magic Bytes. */
    private String detectContentType(byte[] data) {
        if (data.length >= 3
            && data[0] == (byte) 0xFF && data[1] == (byte) 0xD8 && data[2] == (byte) 0xFF) {
            return "image/jpeg";
        }
        if (data.length >= 4
            && data[0] == (byte) 0x89 && data[1] == (byte) 0x50
            && data[2] == (byte) 0x4E && data[3] == (byte) 0x47) {
            return "image/png";
        }
        if (data.length >= 6
            && data[0] == (byte) 0x47 && data[1] == (byte) 0x49 && data[2] == (byte) 0x46) {
            return "image/gif";
        }
        if (data.length >= 4
            && data[0] == (byte) 0x52 && data[1] == (byte) 0x49
            && data[2] == (byte) 0x46 && data[3] == (byte) 0x46) {
            return "image/webp";
        }
        return "image/jpeg"; // Fallback
    }

    /**
     * Delete all media for a store (used when deleting a store)
     */
    @Transactional
    public int deleteAllMediaForStore(Store store) {        List<Media> mediaList = mediaRepository.findByStore(store);
        int deletedCount = 0;

        for (Media media : mediaList) {
            try {
                // Delete from MinIO
                minioService.deleteFile(media.getMinioObjectName());
                deletedCount++;
                log.debug("Deleted MinIO file: {}", media.getMinioObjectName());
            } catch (Exception e) {
                log.warn("Failed to delete MinIO file: {} - {}", media.getMinioObjectName(), e.getMessage());
                // Continue with next file even if one fails
            }
        }

        // Delete all media records from database
        if (!mediaList.isEmpty()) {
            mediaRepository.deleteAll(mediaList);
            log.info("Deleted {} media records from database for store {}", mediaList.size(), store.getId());
        }

        return deletedCount;
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
        // URLs immer frisch generieren (7 Tage Gültigkeit)
        dto.setUrl(minioService.getPresignedUrl(media.getMinioObjectName(), 10080));
        dto.setCreatedAt(media.getCreatedAt());
        return dto;
    }
}

