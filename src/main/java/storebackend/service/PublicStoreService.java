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

        );
    }
}

