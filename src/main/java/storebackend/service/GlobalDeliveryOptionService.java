package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.GlobalDeliveryOptionDTO;
import storebackend.entity.GlobalDeliveryOption;
import storebackend.repository.GlobalDeliveryOptionRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing platform-wide global delivery options.
 * Only the platform admin (owner) can create/update/delete options.
 * All active options are shown automatically in every storefront.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GlobalDeliveryOptionService {

    private final GlobalDeliveryOptionRepository repository;
    private final MinioService minioService;

    // ── PUBLIC (Storefront) ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GlobalDeliveryOptionDTO> getActiveOptions() {
        return repository.findByIsActiveTrueOrderBySortOrderAsc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── ADMIN (Platform owner) ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GlobalDeliveryOptionDTO> getAllOptions() {
        return repository.findAllByOrderBySortOrderAsc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GlobalDeliveryOptionDTO getOption(Long id) {
        return toDTO(findOrThrow(id));
    }

    public GlobalDeliveryOptionDTO createOption(GlobalDeliveryOptionDTO dto) {
        GlobalDeliveryOption option = new GlobalDeliveryOption();
        applyDto(dto, option);
        GlobalDeliveryOption saved = repository.save(option);
        log.info("✅ Created global delivery option: {} (id={})", saved.getName(), saved.getId());
        return toDTO(saved);
    }

    public GlobalDeliveryOptionDTO updateOption(Long id, GlobalDeliveryOptionDTO dto) {
        GlobalDeliveryOption option = findOrThrow(id);
        applyDto(dto, option);
        GlobalDeliveryOption saved = repository.save(option);
        log.info("✅ Updated global delivery option: {} (id={})", saved.getName(), saved.getId());
        return toDTO(saved);
    }

    public void deleteOption(Long id) {
        GlobalDeliveryOption option = findOrThrow(id);
        repository.delete(option);
        log.info("🗑️ Deleted global delivery option: {} (id={})", option.getName(), id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private GlobalDeliveryOption findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Global delivery option not found: " + id));
    }

    private void applyDto(GlobalDeliveryOptionDTO dto, GlobalDeliveryOption entity) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setDeliveryType(dto.getDeliveryType() != null ? dto.getDeliveryType() : "STANDARD");
        entity.setPrice(dto.getPrice());
        entity.setEtaMinDays(dto.getEtaMinDays());
        entity.setEtaMaxDays(dto.getEtaMaxDays());
        entity.setIcon(dto.getIcon() != null ? dto.getIcon() : "🚚");
        entity.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        entity.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 100);
        // Kontakt & Social Media
        entity.setWebsiteUrl(dto.getWebsiteUrl());
        entity.setWhatsappNumber(dto.getWhatsappNumber());
        entity.setInstagramUrl(dto.getInstagramUrl());
        entity.setFacebookUrl(dto.getFacebookUrl());
        entity.setTiktokUrl(dto.getTiktokUrl());
    }

    private GlobalDeliveryOptionDTO toDTO(GlobalDeliveryOption e) {
        // Logo: frische presigned URL generieren
        String logoUrl = null;
        if (e.getLogoObjectName() != null && !e.getLogoObjectName().isBlank()) {
            try {
                logoUrl = minioService.getPresignedUrl(e.getLogoObjectName(), 10080);
            } catch (Exception ex) {
                log.warn("Logo-URL konnte nicht generiert werden für Option {}: {}", e.getId(), ex.getMessage());
                logoUrl = e.getLogoUrl();
            }
        } else {
            logoUrl = e.getLogoUrl();
        }

        return GlobalDeliveryOptionDTO.builder()
                .id(e.getId())
                .name(e.getName())
                .description(e.getDescription())
                .deliveryType(e.getDeliveryType())
                .price(e.getPrice())
                .etaMinDays(e.getEtaMinDays())
                .etaMaxDays(e.getEtaMaxDays())
                .icon(e.getIcon())
                .isActive(e.getIsActive())
                .sortOrder(e.getSortOrder())
                .websiteUrl(e.getWebsiteUrl())
                .logoUrl(logoUrl)
                .whatsappNumber(e.getWhatsappNumber())
                .instagramUrl(e.getInstagramUrl())
                .facebookUrl(e.getFacebookUrl())
                .tiktokUrl(e.getTiktokUrl())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    /**
     * Logo dauerhaft in MinIO hochladen.
     * Gibt die frische presigned URL zurück.
     */
    public String uploadLogo(Long optionId, MultipartFile file) throws java.io.IOException {
        GlobalDeliveryOption option = findOrThrow(optionId);

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Nur Bilddateien erlaubt (JPEG, PNG, WebP)");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("Logo darf maximal 5 MB groß sein");
        }

        // Altes Logo löschen
        if (option.getLogoObjectName() != null && !option.getLogoObjectName().isBlank()) {
            try { minioService.deleteFile(option.getLogoObjectName()); }
            catch (Exception ex) { log.warn("Altes Logo konnte nicht gelöscht werden: {}", ex.getMessage()); }
        }

        // Neues Logo hochladen
        String ext = "";
        String orig = file.getOriginalFilename();
        if (orig != null && orig.contains(".")) ext = orig.substring(orig.lastIndexOf("."));
        String objectName = String.format("delivery-options/%d/logo/%s%s", optionId, UUID.randomUUID(), ext);

        try (java.io.InputStream is = file.getInputStream()) {
            minioService.uploadInputStream(is, file.getSize(), contentType, objectName);
        }

        option.setLogoObjectName(objectName);
        repository.save(option);

        String presignedUrl = minioService.getPresignedUrl(objectName, 10080);
        // URL auch im Feld speichern → Fallback wenn MinIO beim GET nicht erreichbar
        option.setLogoUrl(presignedUrl);
        repository.save(option);

        log.info("✅ Logo hochgeladen für Delivery Option {}: {}", optionId, objectName);
        return presignedUrl;
    }
}

