package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.*;
import storebackend.entity.*;
import storebackend.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing delivery providers
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DeliveryProviderService {

    private final DeliveryProviderRepository providerRepository;
    private final StoreRepository storeRepository;

    public List<DeliveryProviderDTO> getProvidersByStore(Long storeId) {
        return providerRepository.findByStoreIdOrderByPriorityAsc(storeId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public DeliveryProviderDTO getProvider(Long providerId) {
        DeliveryProvider provider = providerRepository.findById(providerId)
            .orElseThrow(() -> new RuntimeException("Provider not found"));
        return toDTO(provider);
    }

    public DeliveryProviderDTO createProvider(Long storeId, DeliveryProviderRequest request) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        DeliveryProvider provider = new DeliveryProvider();
        provider.setStore(store);
        provider.setName(request.getName());
        provider.setType(request.getType());
        provider.setIsActive(request.getIsActive());
        provider.setPriority(request.getPriority());
        provider.setConfigJson(request.getConfigJson());

        provider = providerRepository.save(provider);
        log.info("✅ Created delivery provider: {} (id: {})", provider.getName(), provider.getId());

        return toDTO(provider);
    }

    public DeliveryProviderDTO updateProvider(Long providerId, DeliveryProviderRequest request) {
        DeliveryProvider provider = providerRepository.findById(providerId)
            .orElseThrow(() -> new RuntimeException("Provider not found"));

        provider.setName(request.getName());
        provider.setType(request.getType());
        provider.setIsActive(request.getIsActive());
        provider.setPriority(request.getPriority());
        provider.setConfigJson(request.getConfigJson());

        provider = providerRepository.save(provider);
        log.info("✅ Updated delivery provider: {} (id: {})", provider.getName(), provider.getId());

        return toDTO(provider);
    }

    public void deleteProvider(Long providerId) {
        DeliveryProvider provider = providerRepository.findById(providerId)
            .orElseThrow(() -> new RuntimeException("Provider not found"));

        providerRepository.delete(provider);
        log.info("🗑️ Deleted delivery provider: {} (id: {})", provider.getName(), provider.getId());
    }

    private DeliveryProviderDTO toDTO(DeliveryProvider entity) {
        DeliveryProviderDTO dto = new DeliveryProviderDTO();
        dto.setId(entity.getId());
        dto.setStoreId(entity.getStore().getId());
        dto.setName(entity.getName());
        dto.setType(entity.getType());
        dto.setIsActive(entity.getIsActive());
        dto.setPriority(entity.getPriority());
        dto.setConfigJson(entity.getConfigJson());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}

