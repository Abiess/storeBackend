package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.CreateStoreRequest;
import storebackend.dto.StoreDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.StoreStatus;
import storebackend.repository.StoreRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    public List<StoreDTO> getStoresByOwner(User owner) {
        return storeRepository.findByOwner(owner).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

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

        Store store = new Store();
        store.setOwner(owner);
        store.setName(request.getName());
        store.setSlug(request.getSlug());
        store.setStatus(StoreStatus.ACTIVE);

        store = storeRepository.save(store);
        return toDTO(store);
    }

    public Store getStoreById(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
    }

    private StoreDTO toDTO(Store store) {
        StoreDTO dto = new StoreDTO();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setSlug(store.getSlug());
        dto.setStatus(store.getStatus());
        dto.setCreatedAt(store.getCreatedAt());
        return dto;
    }
}

