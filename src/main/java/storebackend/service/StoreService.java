package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.SaasProperties;
import storebackend.dto.CreateStoreRequest;
import storebackend.dto.StoreDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DomainType;
import storebackend.enums.Role;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreService {

    private final StoreRepository storeRepository;
    private final DomainRepository domainRepository;
    private final UserRepository userRepository;
    private final SaasProperties saasProperties;

    public List<StoreDTO> getStoresByOwner(User owner) {
        return storeRepository.findByOwner(owner).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Prüft, ob ein Slug noch verfügbar ist
     * @param slug Der zu prüfende Slug
     * @return true wenn verfügbar, false wenn bereits vergeben
     */
    public boolean isSlugAvailable(String slug) {
        if (slug == null || slug.trim().isEmpty()) {
            return false;
        }

        // Validiere Slug Format
        if (!slug.matches("^[a-z0-9-]+$")) {
            return false;
        }

        // Prüfe ob Slug bereits existiert
        return !storeRepository.existsBySlug(slug);
    }

    @Transactional
    public StoreDTO createStore(CreateStoreRequest request, User owner) {
        // Check max stores limit
        long currentStoreCount = storeRepository.countByOwner(owner);
        if (owner.getPlan() != null && currentStoreCount >= owner.getPlan().getMaxStores()) {
            throw new RuntimeException("Maximum stores limit reached for your plan");
        }

        // Check if slug already exists
        if (storeRepository.existsBySlug(request.getSlug())) {
            throw new RuntimeException("Slug already exists");
        }

        // Validiere Slug Format (nur alphanumerisch und Bindestriche)
        if (!request.getSlug().matches("^[a-z0-9-]+$")) {
            throw new RuntimeException("Slug can only contain lowercase letters, numbers and hyphens");
        }

        Store store = new Store();
        store.setOwner(owner);
        store.setName(request.getName());
        store.setSlug(request.getSlug());
        store.setStatus(StoreStatus.ACTIVE);

        store = storeRepository.save(store);

        // Upgrade User zu STORE_OWNER Rolle wenn noch nicht vorhanden
        if (!owner.getRoles().contains(Role.ROLE_STORE_OWNER)) {
            Set<Role> roles = new HashSet<>(owner.getRoles());
            roles.add(Role.ROLE_STORE_OWNER);
            owner.setRoles(roles);
            userRepository.save(owner);
            log.info("User {} upgraded to STORE_OWNER role", owner.getEmail());
        }

        // Automatisch Subdomain erstellen
        createDefaultSubdomain(store);

        log.info("Store created successfully: {} with subdomain {}.{}",
                store.getName(), store.getSlug(), saasProperties.getBaseDomain());

        return toDTO(store);
    }

    private void createDefaultSubdomain(Store store) {
        try {
            String subdomain = saasProperties.generateSubdomain(store.getSlug());

            if (domainRepository.existsByHost(subdomain)) {
                log.warn("Subdomain {} already exists, skipping creation", subdomain);
                return;
            }

            Domain domain = new Domain();
            domain.setStore(store);
            domain.setHost(subdomain);
            domain.setType(DomainType.SUBDOMAIN);
            domain.setIsVerified(true); // Subdomains sind automatisch verifiziert
            domain.setIsPrimary(true); // Erste Domain ist primary

            domainRepository.save(domain);
            log.info("Default subdomain created: {}", subdomain);

        } catch (Exception e) {
            log.error("Failed to create default subdomain for store {}: {}", store.getSlug(), e.getMessage());
            // Subdomain-Erstellung sollte Store-Erstellung nicht blockieren
        }
    }

    public Store getStoreById(Long storeId) {
        return storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
    }

    @Transactional
    public StoreDTO updateStore(Long storeId, CreateStoreRequest request, User user) {
        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        // Verify ownership
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to update this store");
        }

        // Update name if provided
        if (request.getName() != null && !request.getName().isEmpty()) {
            store.setName(request.getName());
        }

        // Update description if provided
        if (request.getDescription() != null) {
            store.setDescription(request.getDescription());
        }

        store = storeRepository.save(store);
        log.info("Store {} updated by user {}", storeId, user.getEmail());

        return toDTO(store);
    }

    @Transactional
    public void deleteStore(Long storeId, User user) {
        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        // Verify ownership
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to delete this store");
        }

        storeRepository.delete(store);
        log.info("Store {} deleted by user {}", storeId, user.getEmail());
    }

    public List<Store> getStoresByUserId(Long userId) {
        return storeRepository.findByOwnerId(userId);
    }

    private StoreDTO toDTO(Store store) {
        StoreDTO dto = new StoreDTO();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setSlug(store.getSlug());
        dto.setStatus(store.getStatus());
        dto.setDescription(store.getDescription());
        dto.setCreatedAt(store.getCreatedAt());
        return dto;
    }
}
