package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.*;
import storebackend.entity.*;
import storebackend.repository.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing delivery zones
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DeliveryZoneService {

    private final DeliveryZoneRepository zoneRepository;
    private final StoreRepository storeRepository;

    public List<DeliveryZoneDTO> getZonesByStore(Long storeId) {
        return zoneRepository.findByStoreIdOrderByNameAsc(storeId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public DeliveryZoneDTO getZone(Long zoneId) {
        DeliveryZone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> new RuntimeException("Zone not found"));
        return toDTO(zone);
    }

    public DeliveryZoneDTO createZone(Long storeId, DeliveryZoneRequest request) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));

        DeliveryZone zone = new DeliveryZone();
        zone.setStore(store);
        zone.setName(request.getName());
        zone.setIsActive(request.getIsActive());
        zone.setCountry(request.getCountry());
        zone.setCity(request.getCity());
        zone.setPostalCodeRanges(request.getPostalCodeRanges());
        zone.setMinOrderValue(request.getMinOrderValue());
        zone.setFeeStandard(request.getFeeStandard());
        zone.setFeeExpress(request.getFeeExpress());
        zone.setEtaStandardMinutes(request.getEtaStandardMinutes());
        zone.setEtaExpressMinutes(request.getEtaExpressMinutes());

        zone = zoneRepository.save(zone);
        log.info("✅ Created delivery zone: {} (id: {})", zone.getName(), zone.getId());

        return toDTO(zone);
    }

    public DeliveryZoneDTO updateZone(Long zoneId, DeliveryZoneRequest request) {
        DeliveryZone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> new RuntimeException("Zone not found"));

        zone.setName(request.getName());
        zone.setIsActive(request.getIsActive());
        zone.setCountry(request.getCountry());
        zone.setCity(request.getCity());
        zone.setPostalCodeRanges(request.getPostalCodeRanges());
        zone.setMinOrderValue(request.getMinOrderValue());
        zone.setFeeStandard(request.getFeeStandard());
        zone.setFeeExpress(request.getFeeExpress());
        zone.setEtaStandardMinutes(request.getEtaStandardMinutes());
        zone.setEtaExpressMinutes(request.getEtaExpressMinutes());

        zone = zoneRepository.save(zone);
        log.info("✅ Updated delivery zone: {} (id: {})", zone.getName(), zone.getId());

        return toDTO(zone);
    }

    public void deleteZone(Long zoneId) {
        DeliveryZone zone = zoneRepository.findById(zoneId)
            .orElseThrow(() -> new RuntimeException("Zone not found"));

        zoneRepository.delete(zone);
        log.info("🗑️ Deleted delivery zone: {} (id: {})", zone.getName(), zone.getId());
    }

    private DeliveryZoneDTO toDTO(DeliveryZone entity) {
        DeliveryZoneDTO dto = new DeliveryZoneDTO();
        dto.setId(entity.getId());
        dto.setStoreId(entity.getStore().getId());
        dto.setName(entity.getName());
        dto.setIsActive(entity.getIsActive());
        dto.setCountry(entity.getCountry());
        dto.setCity(entity.getCity());
        dto.setPostalCodeRanges(entity.getPostalCodeRanges());
        dto.setMinOrderValue(entity.getMinOrderValue());
        dto.setFeeStandard(entity.getFeeStandard());
        dto.setFeeExpress(entity.getFeeExpress());
        dto.setEtaStandardMinutes(entity.getEtaStandardMinutes());
        dto.setEtaExpressMinutes(entity.getEtaExpressMinutes());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}

