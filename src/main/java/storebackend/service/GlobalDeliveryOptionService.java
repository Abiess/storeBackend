package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.GlobalDeliveryOptionDTO;
import storebackend.entity.GlobalDeliveryOption;
import storebackend.repository.GlobalDeliveryOptionRepository;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing platform-wide global delivery options.
 * Only the platform admin (owner) can create/update/delete options.
 * All active options are shown automatically in every storefront.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GlobalDeliveryOptionService {

    private final GlobalDeliveryOptionRepository repository;

    // ── PUBLIC (Storefront) ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GlobalDeliveryOptionDTO> getActiveOptions() {
        return repository.findByIsActiveTrueOrderBySortOrderAsc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── ADMIN (Platform owner) ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GlobalDeliveryOptionDTO> getAllOptions() {
        return repository.findAllByOrderBySortOrderAsc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GlobalDeliveryOptionDTO getOption(Long id) {
        return toDTO(findOrThrow(id));
    }

    public GlobalDeliveryOptionDTO createOption(GlobalDeliveryOptionDTO dto) {
        GlobalDeliveryOption option = new GlobalDeliveryOption();
        applyDto(dto, option);
        GlobalDeliveryOption saved = repository.save(option);
        log.info("✅ Created global delivery option: {} (id={})", saved.getName(), saved.getId());
        return toDTO(saved);
    }

    public GlobalDeliveryOptionDTO updateOption(Long id, GlobalDeliveryOptionDTO dto) {
        GlobalDeliveryOption option = findOrThrow(id);
        applyDto(dto, option);
        GlobalDeliveryOption saved = repository.save(option);
        log.info("✅ Updated global delivery option: {} (id={})", saved.getName(), saved.getId());
        return toDTO(saved);
    }

    public void deleteOption(Long id) {
        GlobalDeliveryOption option = findOrThrow(id);
        repository.delete(option);
        log.info("🗑️ Deleted global delivery option: {} (id={})", option.getName(), id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private GlobalDeliveryOption findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Global delivery option not found: " + id));
    }

    private void applyDto(GlobalDeliveryOptionDTO dto, GlobalDeliveryOption entity) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setDeliveryType(dto.getDeliveryType() != null ? dto.getDeliveryType() : "STANDARD");
        entity.setPrice(dto.getPrice());
        entity.setEtaMinDays(dto.getEtaMinDays());
        entity.setEtaMaxDays(dto.getEtaMaxDays());
        entity.setIcon(dto.getIcon() != null ? dto.getIcon() : "🚚");
        entity.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        entity.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 100);
    }

    private GlobalDeliveryOptionDTO toDTO(GlobalDeliveryOption e) {
        return GlobalDeliveryOptionDTO.builder()
                .id(e.getId())
                .name(e.getName())
                .description(e.getDescription())
                .deliveryType(e.getDeliveryType())
                .price(e.getPrice())
                .etaMinDays(e.getEtaMinDays())
                .etaMaxDays(e.getEtaMaxDays())
                .icon(e.getIcon())
                .isActive(e.getIsActive())
                .sortOrder(e.getSortOrder())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}

