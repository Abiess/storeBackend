package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.PublicStoreDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.enums.CurrencyCode;
import storebackend.enums.PriceMode;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;

@Service
public class PublicStoreService {

    private final DomainRepository domainRepository;
    private final MediaService mediaService;

    public PublicStoreService(DomainRepository domainRepository, MediaService mediaService) {
        this.domainRepository = domainRepository;
        this.mediaService = mediaService;
    }

    public PublicStoreDTO resolveStoreByHost(String host) {
        Domain domain = domainRepository.findByHost(host)
                .orElseThrow(() -> new RuntimeException("Store not found for this host"));

        Store store = domain.getStore();

        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw new RuntimeException("Store is not active");
        }

        // NULL-safe mapping with intermediate variables
        CurrencyCode currency = store.getCurrencyCode();
        PriceMode priceMode = store.getPriceMode();
        String aboutImageUrl = null;
        if (store.getAboutImageMediaId() != null) {
            try {
                aboutImageUrl = mediaService.getMediaUrl(store.getAboutImageMediaId());
            } catch (RuntimeException ignored) {
                aboutImageUrl = null;
            }
        }
        
        return new PublicStoreDTO(
            store.getId(),
            domain.getId(),
            store.getName(),
            store.getSlug(),
            store.getDescription(),
            store.getLogoUrl(),
            domain.getHost(),
            store.getStatus().name(),
            store.getWhatsappNumber(),
            store.getGreetingMessage(),
            store.getContactEmail(),
            store.getContactPhone(),
            store.getTelegramUrl(),
            store.getFacebookUrl(),
            store.getInstagramUrl(),
            store.getTiktokUrl(),
            store.getFooterText(),
            store.getAboutTitle(),
            store.getAboutSubtitle(),
            store.getAboutText(),
            aboutImageUrl,
            store.getBusinessType() != null ? store.getBusinessType().name() : null,
            store.getOpeningHours(),
            store.getAddress(),
            store.getGoogleMapsUrl(),
            store.getReservationWhatsappText(),
            // DHL Shipping (set to null/false for MVP - not implemented here)
            false,
            null,
            null,
            null,
            // Currency & Tax (Public) - NULL-safe with intermediate variables
            currency != null ? currency.name() : "EUR",
            store.getCountryCode() != null ? store.getCountryCode() : "DE",
            priceMode != null ? priceMode.name() : "GROSS",
            // Legal/Impressum (PUBLIC - für öffentliche Seiten)
            store.getLegalName(),
            store.getLegalForm(),
            store.getAuthorizedRepresentative(),
            store.getCommercialRegister(),
            store.getRegisterNumber(),
            store.getVatId(),
            store.getImprintComplete(),
            // Legal Texts (store-specific, PUBLIC) - NUR wenn Status = PUBLISHED
            store.getTermsAndConditionsStatus() == storebackend.enums.LegalTextStatus.PUBLISHED 
                ? store.getTermsAndConditionsText() 
                : null,
            store.getPrivacyPolicyStatus() == storebackend.enums.LegalTextStatus.PUBLISHED 
                ? store.getPrivacyPolicyText() 
                : null,
            store.getReturnPolicyStatus() == storebackend.enums.LegalTextStatus.PUBLISHED 
                ? store.getReturnPolicyText() 
                : null,
            store.getShippingPolicyStatus() == storebackend.enums.LegalTextStatus.PUBLISHED 
                ? store.getShippingPolicyText() 
                : null
        );
    }
}
