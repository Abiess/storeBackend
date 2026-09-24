package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.DeliveryPartnerDTO;
import storebackend.dto.DeliveryPartnerRequest;
import storebackend.dto.DeliveryPartnerReviewDTO;
import storebackend.entity.DeliveryPartner;
import storebackend.entity.DeliveryPartnerReview;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.DeliveryPartnerRepository;
import storebackend.repository.DeliveryPartnerReviewRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryPartnerMarketplaceService {

    private final DeliveryPartnerRepository partnerRepo;
    private final DeliveryPartnerReviewRepository reviewRepo;
    private final StoreRepository storeRepo;
    private final MinioService minioService;

    // ═══════════════════════════════════════════════
    //  MARKETPLACE – Suche
    // ═══════════════════════════════════════════════

    public List<DeliveryPartnerDTO> searchPartners(String type, Boolean verified,
                                                    String search, String region,
                                                    String service, Boolean international) {
        List<DeliveryPartner> partners = partnerRepo.searchPartners(type, verified, search);

        return partners.stream()
            .filter(p -> region == null || (p.getMoroccoRegions() != null && p.getMoroccoRegions().contains(region)))
            .filter(p -> service == null || (p.getServices() != null && p.getServices().contains(service)))
            .filter(p -> international == null || (p.getCoverageInternational() != null && p.getCoverageInternational().equals(international)))
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public List<DeliveryPartnerDTO> getFeaturedPartners() {
        return partnerRepo.findByFeaturedTrueAndActiveTrue().stream()
            .map(this::toDTO).collect(Collectors.toList());
    }

    public DeliveryPartnerDTO getPartner(Long partnerId) {
        DeliveryPartner p = partnerRepo.findById(partnerId)
            .orElseThrow(() -> new RuntimeException("Partner not found: " + partnerId));
        return toDTO(p);
    }

    // ═══════════════════════════════════════════════
    //  EIGENES PROFIL
    // ═══════════════════════════════════════════════

    public DeliveryPartnerDTO getMyProfile(User user) {
        DeliveryPartner p = partnerRepo.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("No delivery partner profile found"));
        return toDTO(p);
    }

    @Transactional
    public DeliveryPartnerDTO createProfile(User user, DeliveryPartnerRequest req) {
        if (partnerRepo.existsByUserId(user.getId())) {
            throw new RuntimeException("Profile already exists. Use PUT to update.");
        }

        DeliveryPartner p = new DeliveryPartner();
        p.setUser(user);
        applyRequest(p, req);
        partnerRepo.save(p);

        log.info("✅ Delivery partner profile created: {} (user={})", p.getId(), user.getEmail());
        return toDTO(p);
    }

    @Transactional
    public DeliveryPartnerDTO updateProfile(User user, DeliveryPartnerRequest req) {
        DeliveryPartner p = partnerRepo.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("No delivery partner profile found"));
        applyRequest(p, req);
        partnerRepo.save(p);

        log.info("✅ Delivery partner profile updated: {} (user={})", p.getId(), user.getEmail());
        return toDTO(p);
    }

    @Transactional
    public DeliveryPartnerDTO toggleActive(User user, boolean active) {
        DeliveryPartner p = partnerRepo.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("No delivery partner profile found"));
        p.setActive(active);
        partnerRepo.save(p);
        return toDTO(p);
    }

    /**
     * Logo dauerhaft in MinIO hochladen und objektName im Profil speichern.
     * Gibt die frische presigned URL zurück.
     */
    @Transactional
    public String uploadLogo(User user, MultipartFile file) throws java.io.IOException {
        DeliveryPartner p = partnerRepo.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("No delivery partner profile found"));

        // Validierung
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Nur Bilddateien erlaubt (JPEG, PNG, WebP)");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("Logo darf maximal 5 MB groß sein");
        }

        // Altes Logo aus MinIO löschen (falls vorhanden)
        if (p.getLogoObjectName() != null && !p.getLogoObjectName().isBlank()) {
            try {
                minioService.deleteFile(p.getLogoObjectName());
            } catch (Exception ex) {
                log.warn("Altes Logo konnte nicht gelöscht werden: {}", ex.getMessage());
            }
        }

        // Neues Logo hochladen – Pfad: delivery-partners/{userId}/logo/{uuid}.ext
        String ext = "";
        String orig = file.getOriginalFilename();
        if (orig != null && orig.contains(".")) {
            ext = orig.substring(orig.lastIndexOf("."));
        }
        String objectName = String.format("delivery-partners/%d/logo/%s%s",
                user.getId(), java.util.UUID.randomUUID(), ext);

        try (java.io.InputStream is = file.getInputStream()) {
            minioService.uploadInputStream(is, file.getSize(), contentType, objectName);
        }

        // Dauerhaften Objektpfad speichern
        p.setLogoObjectName(objectName);
        partnerRepo.save(p);

        // Frische permanente öffentliche URL (kein Ablaufdatum)
        String publicUrl = minioService.getPublicUrl(objectName);
        p.setLogoUrl(publicUrl);
        partnerRepo.save(p);

        log.info("✅ Delivery partner logo uploaded (permanent URL): partner={}, object={}", p.getId(), objectName);
        return publicUrl;
    }

    // ═══════════════════════════════════════════════
    //  BEWERTUNGEN
    // ═══════════════════════════════════════════════

    public List<DeliveryPartnerReviewDTO> getPartnerReviews(Long partnerId) {
        return reviewRepo.findByPartnerIdOrderByCreatedAtDesc(partnerId).stream()
            .map(this::toReviewDTO).collect(Collectors.toList());
    }

    @Transactional
    public DeliveryPartnerReviewDTO createReview(Long partnerId, User reviewer, DeliveryPartnerReviewDTO dto) {
        DeliveryPartner partner = partnerRepo.findById(partnerId)
            .orElseThrow(() -> new RuntimeException("Partner not found: " + partnerId));

        if (reviewRepo.existsByPartnerIdAndReviewerId(partnerId, reviewer.getId())) {
            throw new RuntimeException("You have already reviewed this partner");
        }

        // Store-Name des Reviewers finden
        String storeName = storeRepo.findByOwnerId(reviewer.getId()).stream()
            .findFirst().map(Store::getName).orElse(reviewer.getName());

        DeliveryPartnerReview review = new DeliveryPartnerReview();
        review.setPartner(partner);
        review.setReviewer(reviewer);
        review.setReviewerStoreName(storeName);
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        review.setReliability(dto.getReliability() != null ? dto.getReliability() : 0);
        review.setSpeed(dto.getSpeed() != null ? dto.getSpeed() : 0);
        review.setCommunication(dto.getCommunication() != null ? dto.getCommunication() : 0);
        review.setPriceQuality(dto.getPriceQuality() != null ? dto.getPriceQuality() : 0);
        reviewRepo.save(review);

        // Partner-Rating aktualisieren
        updatePartnerRating(partner);

        log.info("✅ Review created for partner {} by user {}", partnerId, reviewer.getEmail());
        return toReviewDTO(review);
    }

    private void updatePartnerRating(DeliveryPartner partner) {
        Double avg = reviewRepo.getAverageRating(partner.getId());
        Integer count = reviewRepo.getReviewCount(partner.getId());
        partner.setAverageRating(avg != null ? BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        partner.setTotalReviews(count != null ? count : 0);
        partnerRepo.save(partner);
    }

    // ═══════════════════════════════════════════════
    //  MAPPING
    // ═══════════════════════════════════════════════

    private void applyRequest(DeliveryPartner p, DeliveryPartnerRequest req) {
        p.setType(req.getType());
        p.setCompanyName(req.getCompanyName());
        p.setContactName(req.getContactName());
        p.setEmail(req.getEmail());
        p.setPhone(req.getPhone());
        p.setWhatsapp(req.getWhatsapp());
        p.setWebsite(req.getWebsite());
        p.setIce(req.getIce());
        p.setRc(req.getRc());
        p.setTaxId(req.getTaxId());
        p.setDescription(req.getDescription());
        p.setServicesList(req.getServices());
        p.setVehicleTypesList(req.getVehicleTypes());
        p.setBasePriceLocal(req.getBasePriceLocal());
        p.setBasePriceNational(req.getBasePriceNational());
        p.setBasePriceInternational(req.getBasePriceInternational());
        p.setCurrency(req.getCurrency() != null ? req.getCurrency() : "MAD");
        p.setCodFeePercent(req.getCodFeePercent());
        p.setEstimatedLocalHours(req.getEstimatedLocalHours());
        p.setEstimatedNationalDays(req.getEstimatedNationalDays());
        p.setEstimatedInternationalDays(req.getEstimatedInternationalDays());
        p.setMaxWeightKg(req.getMaxWeightKg());

        if (req.getCoverage() != null) {
            p.setCoverageMorocco(req.getCoverage().getMorocco());
            p.setMoroccoRegionsList(req.getCoverage().getMoroccoRegions());
            p.setCoverageInternational(req.getCoverage().getInternational());
            p.setInternationalCountriesList(req.getCoverage().getInternationalCountries());
        }
    }

    private DeliveryPartnerDTO toDTO(DeliveryPartner p) {
        DeliveryPartnerDTO dto = new DeliveryPartnerDTO();
        dto.setId(p.getId());
        dto.setUserId(p.getUser().getId());
        dto.setType(p.getType());
        dto.setCompanyName(p.getCompanyName());
        dto.setContactName(p.getContactName());
        dto.setEmail(p.getEmail());
        dto.setPhone(p.getPhone());
        dto.setWhatsapp(p.getWhatsapp());
        dto.setWebsite(p.getWebsite());
        dto.setLogoUrl(p.getLogoUrl());
        dto.setIce(p.getIce());
        dto.setRc(p.getRc());
        dto.setTaxId(p.getTaxId());
        dto.setDescription(p.getDescription());
        dto.setServices(p.getServicesList());
        dto.setVehicleTypes(p.getVehicleTypesList());
        dto.setBasePriceLocal(p.getBasePriceLocal());
        dto.setBasePriceNational(p.getBasePriceNational());
        dto.setBasePriceInternational(p.getBasePriceInternational());
        dto.setCurrency(p.getCurrency());
        dto.setCodFeePercent(p.getCodFeePercent());
        dto.setEstimatedLocalHours(p.getEstimatedLocalHours());
        dto.setEstimatedNationalDays(p.getEstimatedNationalDays());
        dto.setEstimatedInternationalDays(p.getEstimatedInternationalDays());
        dto.setMaxWeightKg(p.getMaxWeightKg());
        dto.setAverageRating(p.getAverageRating());
        dto.setTotalReviews(p.getTotalReviews());
        dto.setCompletedDeliveries(p.getCompletedDeliveries());
        dto.setVerified(p.getVerified());
        dto.setActive(p.getActive());
        dto.setFeatured(p.getFeatured());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());

        DeliveryPartnerDTO.CoverageDTO cov = new DeliveryPartnerDTO.CoverageDTO();
        cov.setMorocco(p.getCoverageMorocco());
        cov.setMoroccoRegions(p.getMoroccoRegionsList());
        cov.setInternational(p.getCoverageInternational());
        cov.setInternationalCountries(p.getInternationalCountriesList());
        dto.setCoverage(cov);

        return dto;
    }

    private DeliveryPartnerReviewDTO toReviewDTO(DeliveryPartnerReview r) {
        DeliveryPartnerReviewDTO dto = new DeliveryPartnerReviewDTO();
        dto.setId(r.getId());
        dto.setPartnerId(r.getPartner().getId());
        dto.setReviewerUserId(r.getReviewer().getId());
        dto.setReviewerStoreName(r.getReviewerStoreName());
        dto.setRating(r.getRating());
        dto.setComment(r.getComment());
        dto.setReliability(r.getReliability());
        dto.setSpeed(r.getSpeed());
        dto.setCommunication(r.getCommunication());
        dto.setPriceQuality(r.getPriceQuality());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}

