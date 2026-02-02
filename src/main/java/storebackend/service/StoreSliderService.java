package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.*;
import storebackend.entity.*;
import storebackend.enums.MediaType;
import storebackend.enums.SliderImageType;
import storebackend.enums.SliderOverrideMode;
import storebackend.repository.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreSliderService {

    private final StoreSliderSettingsRepository settingsRepository;
    private final StoreSliderImageRepository imageRepository;
    private final DefaultSliderImageRepository defaultImageRepository;
    private final StoreRepository storeRepository;
    private final MediaService mediaService;
    private final MediaRepository mediaRepository;

    @Transactional
    public void initializeSliderForNewStore(Store store, String category) {
        log.info("Initializing slider for store: {} with category: {}", store.getId(), category);

        StoreSliderSettings settings = new StoreSliderSettings();
        settings.setStore(store);
        settings.setOverrideMode(SliderOverrideMode.DEFAULT_ONLY);
        settings.setAutoplay(true);
        settings.setDurationMs(5000);
        settings.setTransitionMs(500);
        settings.setLoopEnabled(true);
        settings.setShowDots(true);
        settings.setShowArrows(true);
        settingsRepository.save(settings);

        List<DefaultSliderImage> defaultImages = getDefaultImagesForCategory(category);

        int order = 0;
        for (DefaultSliderImage defImage : defaultImages) {
            StoreSliderImage sliderImage = new StoreSliderImage();
            sliderImage.setStore(store);
            sliderImage.setImageUrl(defImage.getImageUrl());
            sliderImage.setImageType(SliderImageType.DEFAULT);
            sliderImage.setDisplayOrder(order++);
            sliderImage.setIsActive(true);
            sliderImage.setAltText(defImage.getAltText());
            imageRepository.save(sliderImage);
        }

        log.info("Slider initialized with {} default images", defaultImages.size());
    }

    private List<DefaultSliderImage> getDefaultImagesForCategory(String category) {
        if (category == null || category.isBlank()) {
            category = "general";
        }

        List<DefaultSliderImage> images = defaultImageRepository
                .findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(category);

        if (images.isEmpty()) {
            images = defaultImageRepository
                    .findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc("general");
        }

        return images;
    }

    @Transactional(readOnly = true)
    public StoreSliderDTO getSliderByStoreId(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // Auto-initialize if missing
        StoreSliderSettings settings = settingsRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    log.warn("Slider settings not found for store {}. Auto-initializing...", storeId);
                    return createDefaultSettings(store);
                });

        List<StoreSliderImage> images = getImagesBasedOnMode(storeId, settings.getOverrideMode());

        StoreSliderDTO dto = new StoreSliderDTO();
        dto.setSettings(mapSettingsToDTO(settings));
        dto.setImages(images.stream().map(this::mapImageToDTO).collect(Collectors.toList()));

        return dto;
    }

    @Transactional(readOnly = true)
    public List<StoreSliderImageDTO> getActiveSliderImages(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // Auto-initialize if missing
        StoreSliderSettings settings = settingsRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    log.warn("Slider settings not found for store {}. Auto-initializing...", storeId);
                    return createDefaultSettings(store);
                });

        List<StoreSliderImage> images = getImagesBasedOnMode(storeId, settings.getOverrideMode())
                .stream()
                .filter(StoreSliderImage::getIsActive)
                .collect(Collectors.toList());

        return images.stream().map(this::mapImageToDTO).collect(Collectors.toList());
    }

    private List<StoreSliderImage> getImagesBasedOnMode(Long storeId, SliderOverrideMode mode) {
        switch (mode) {
            case DEFAULT_ONLY:
                return imageRepository.findByStoreIdAndImageTypeOrderByDisplayOrderAsc(
                        storeId, SliderImageType.DEFAULT);
            case OWNER_ONLY:
                return imageRepository.findByStoreIdAndImageTypeOrderByDisplayOrderAsc(
                        storeId, SliderImageType.OWNER_UPLOAD);
            case MIXED:
                return imageRepository.findByStoreIdOrderByDisplayOrderAsc(storeId);
            default:
                return new ArrayList<>();
        }
    }

    @Transactional
    public StoreSliderSettingsDTO updateSettings(Long storeId, StoreSliderSettingsDTO dto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // Auto-initialize if missing
        StoreSliderSettings settings = settingsRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    log.warn("Slider settings not found for store {}. Auto-initializing...", storeId);
                    return createDefaultSettings(store);
                });

        if (dto.getOverrideMode() != null) {
            settings.setOverrideMode(dto.getOverrideMode());
        }
        if (dto.getAutoplay() != null) {
            settings.setAutoplay(dto.getAutoplay());
        }
        if (dto.getDurationMs() != null) {
            settings.setDurationMs(dto.getDurationMs());
        }
        if (dto.getTransitionMs() != null) {
            settings.setTransitionMs(dto.getTransitionMs());
        }
        if (dto.getLoopEnabled() != null) {
            settings.setLoopEnabled(dto.getLoopEnabled());
        }
        if (dto.getShowDots() != null) {
            settings.setShowDots(dto.getShowDots());
        }
        if (dto.getShowArrows() != null) {
            settings.setShowArrows(dto.getShowArrows());
        }

        settings = settingsRepository.save(settings);
        return mapSettingsToDTO(settings);
    }

    @Transactional
    public StoreSliderImageDTO uploadOwnerImage(Long storeId, MultipartFile file, String altText) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        try {
            UploadMediaResponse uploadResponse = mediaService.uploadMedia(
                    file, store, store.getOwner(), MediaType.IMAGE, altText);

            Media media = mediaRepository.findById(uploadResponse.getMediaId())
                    .orElseThrow(() -> new RuntimeException("Media not found after upload"));

            StoreSliderImage sliderImage = new StoreSliderImage();
            sliderImage.setStore(store);
            sliderImage.setMedia(media);
            sliderImage.setImageUrl(uploadResponse.getUrl());
            sliderImage.setImageType(SliderImageType.OWNER_UPLOAD);
            sliderImage.setAltText(altText);
            sliderImage.setIsActive(true);

            long ownerImageCount = imageRepository.countByStoreIdAndImageType(storeId, SliderImageType.OWNER_UPLOAD);
            sliderImage.setDisplayOrder((int) ownerImageCount);

            sliderImage = imageRepository.save(sliderImage);

            if (ownerImageCount == 0) {
                StoreSliderSettings settings = settingsRepository.findByStoreId(storeId)
                        .orElseThrow(() -> new RuntimeException("Slider settings not found"));
                settings.setOverrideMode(SliderOverrideMode.OWNER_ONLY);
                settingsRepository.save(settings);
                log.info("Auto-switched slider mode to OWNER_ONLY for store {}", storeId);
            }

            return mapImageToDTO(sliderImage);
        } catch (IOException e) {
            log.error("Failed to upload slider image for store {}: {}", storeId, e.getMessage());
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    @Transactional
    public StoreSliderImageDTO updateSliderImage(Long imageId, StoreSliderImageDTO dto) {
        StoreSliderImage image = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Slider image not found: " + imageId));

        if (dto.getDisplayOrder() != null) {
            image.setDisplayOrder(dto.getDisplayOrder());
        }
        if (dto.getIsActive() != null) {
            image.setIsActive(dto.getIsActive());
        }
        if (dto.getAltText() != null) {
            image.setAltText(dto.getAltText());
        }

        image = imageRepository.save(image);
        return mapImageToDTO(image);
    }

    @Transactional
    public void reorderImages(Long storeId, List<Long> imageIds) {
        for (int i = 0; i < imageIds.size(); i++) {
            final int order = i;
            Long imageId = imageIds.get(i);
            imageRepository.findById(imageId).ifPresent(image -> {
                if (image.getStore().getId().equals(storeId)) {
                    image.setDisplayOrder(order);
                    imageRepository.save(image);
                }
            });
        }
    }

    @Transactional
    public void deleteSliderImage(Long imageId) {
        StoreSliderImage image = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Slider image not found: " + imageId));

        if (image.getImageType() == SliderImageType.OWNER_UPLOAD && image.getMedia() != null) {
            try {
                mediaService.deleteMedia(image.getMedia().getId(), image.getStore());
            } catch (Exception e) {
                log.error("Failed to delete media {}: {}", image.getMedia().getId(), e.getMessage());
            }
        }

        imageRepository.delete(image);
    }

    private StoreSliderSettingsDTO mapSettingsToDTO(StoreSliderSettings settings) {
        StoreSliderSettingsDTO dto = new StoreSliderSettingsDTO();
        dto.setId(settings.getId());
        dto.setStoreId(settings.getStore().getId());
        dto.setOverrideMode(settings.getOverrideMode());
        dto.setAutoplay(settings.getAutoplay());
        dto.setDurationMs(settings.getDurationMs());
        dto.setTransitionMs(settings.getTransitionMs());
        dto.setLoopEnabled(settings.getLoopEnabled());
        dto.setShowDots(settings.getShowDots());
        dto.setShowArrows(settings.getShowArrows());
        return dto;
    }

    private StoreSliderImageDTO mapImageToDTO(StoreSliderImage image) {
        StoreSliderImageDTO dto = new StoreSliderImageDTO();
        dto.setId(image.getId());
        dto.setStoreId(image.getStore().getId());
        dto.setMediaId(image.getMedia() != null ? image.getMedia().getId() : null);
        dto.setImageUrl(image.getImageUrl());
        dto.setImageType(image.getImageType());
        dto.setDisplayOrder(image.getDisplayOrder());
        dto.setIsActive(image.getIsActive());
        dto.setAltText(image.getAltText());
        return dto;
    }

    /**
     * Creates default slider settings for a store
     */
    @Transactional
    private StoreSliderSettings createDefaultSettings(Store store) {
        StoreSliderSettings settings = new StoreSliderSettings();
        settings.setStore(store);
        settings.setOverrideMode(SliderOverrideMode.DEFAULT_ONLY);
        settings.setAutoplay(true);
        settings.setDurationMs(5000);
        settings.setTransitionMs(500);
        settings.setLoopEnabled(true);
        settings.setShowDots(true);
        settings.setShowArrows(true);
        settings = settingsRepository.save(settings);

        log.info("Created default slider settings for store {}", store.getId());
        return settings;
    }

    /**
     * Initialize slider if missing (can be called via API endpoint)
     */
    @Transactional
    public StoreSliderDTO initializeSliderIfMissing(Long storeId, String category) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));

        // Check if already initialized
        if (settingsRepository.findByStoreId(storeId).isPresent()) {
            log.info("Slider already initialized for store {}", storeId);
            return getSliderByStoreId(storeId);
        }

        // Initialize with full setup
        initializeSliderForNewStore(store, category);
        return getSliderByStoreId(storeId);
    }
}
