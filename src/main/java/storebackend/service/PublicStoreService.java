package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.PublicStoreDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;

@Service
public class PublicStoreService {

    private final DomainRepository domainRepository;

    public PublicStoreService(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    public PublicStoreDTO resolveStoreByHost(String host) {
        Domain domain = domainRepository.findByHost(host)
                .orElseThrow(() -> new RuntimeException("Store not found for this host"));

        Store store = domain.getStore();

        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw new RuntimeException("Store is not active");
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
            // Currency & Tax (Public)
            store.getCurrencyCode() != null ? store.getCurrencyCode().name() : "EUR",
            store.getCountryCode() != null ? store.getCountryCode() : "DE",
            store.getPriceMode() != null ? store.getPriceMode().name() : "GROSS"
        );
    }
}

