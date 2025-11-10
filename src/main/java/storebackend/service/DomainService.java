package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.CreateDomainRequest;
import storebackend.dto.DomainDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.DomainRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DomainService {

    private final DomainRepository domainRepository;

    public DomainService(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    public List<DomainDTO> getDomainsByStore(Store store) {
        return domainRepository.findByStore(store).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public DomainDTO createDomain(CreateDomainRequest request, Store store, User owner) {
        // Check max custom domains limit
        if (owner.getPlan() != null) {
            long customDomainCount = domainRepository.findByStore(store).stream()
                    .filter(d -> d.getType() == storebackend.enums.DomainType.CUSTOM)
                    .count();

            if (customDomainCount >= owner.getPlan().getMaxCustomDomains()) {
                throw new RuntimeException("Maximum custom domains limit reached for your plan");
            }
        }

        // Check if host already exists
        if (domainRepository.existsByHost(request.getHost())) {
            throw new RuntimeException("Domain host already exists");
        }

        Domain domain = new Domain();
        domain.setStore(store);
        domain.setHost(request.getHost());
        domain.setType(request.getType());
        domain.setIsVerified(false);

        domain = domainRepository.save(domain);
        return toDTO(domain);
    }

    private DomainDTO toDTO(Domain domain) {
        DomainDTO dto = new DomainDTO();
        dto.setId(domain.getId());
        dto.setHost(domain.getHost());
        dto.setType(domain.getType());
        dto.setIsVerified(domain.getIsVerified());
        dto.setCreatedAt(domain.getCreatedAt());
        return dto;
    }
}

