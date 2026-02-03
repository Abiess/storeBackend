package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.StoreDeliverySettingsDTO;
import storebackend.entity.Store;
import storebackend.entity.StoreDeliverySettings;
import storebackend.repository.StoreDeliverySettingsRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;

/**
 * Service for managing store delivery settings
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StoreDeliverySettingsService {

    private final StoreDeliverySettingsRepository settingsRepository;
    private final StoreRepository storeRepository;

    public StoreDeliverySettingsDTO getSettings(Long storeId) {
        StoreDeliverySettings settings = settingsRepository.findByStoreId(storeId)
            .orElseGet(() -> createDefaultSettings(storeId));
        return toDTO(settings);
    }

    public StoreDeliverySettingsDTO updateSettings(Long storeId, StoreDeliverySettingsDTO request) {
        StoreDeliverySettings settings = settingsRepository.findByStoreId(storeId)
            .orElseGet(() -> createDefaultSettings(storeId));

        settings.setPickupEnabled(request.getPickupEnabled());
        settings.setDeliveryEnabled(request.getDeliveryEnabled());
        settings.setExpressEnabled(request.getExpressEnabled());
        settings.setCurrency(request.getCurrency());

        settings = settingsRepository.save(settings);
        log.info("✅ Updated delivery settings for store {}", storeId);

        return toDTO(settings);
    }

    private StoreDeliverySettings createDefaultSettings(Long storeId) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        StoreDeliverySettings settings = new StoreDeliverySettings();
        settings.setStore(store);
        settings.setStoreId(storeId);
        settings.setPickupEnabled(true);
        settings.setDeliveryEnabled(false);
        settings.setExpressEnabled(false);
        settings.setCurrency("EUR");
        settings.setUpdatedAt(LocalDateTime.now());

        return settingsRepository.save(settings);
    }

    private StoreDeliverySettingsDTO toDTO(StoreDeliverySettings entity) {
        StoreDeliverySettingsDTO dto = new StoreDeliverySettingsDTO();
        dto.setStoreId(entity.getStoreId());
        dto.setPickupEnabled(entity.getPickupEnabled());
        dto.setDeliveryEnabled(entity.getDeliveryEnabled());
        dto.setExpressEnabled(entity.getExpressEnabled());
        dto.setCurrency(entity.getCurrency());
        return dto;
    }
}
