package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateHomepageSectionRequest;
import storebackend.dto.HomepageSectionDTO;
import storebackend.entity.HomepageSection;
import storebackend.entity.Store;
import storebackend.repository.HomepageSectionRepository;
import storebackend.repository.StoreRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HomepageSectionService {

    private final HomepageSectionRepository sectionRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public List<HomepageSectionDTO> getStoreSections(Long storeId) {
        return sectionRepository.findByStoreIdOrderBySortOrderAsc(storeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HomepageSectionDTO> getActiveSections(Long storeId) {
        return sectionRepository.findByStoreIdAndIsActiveOrderBySortOrderAsc(storeId, true).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public HomepageSectionDTO createSection(CreateHomepageSectionRequest request) {
        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new RuntimeException("Store not found"));

        HomepageSection section = new HomepageSection();
        section.setStore(store);
        section.setSectionType(request.getSectionType());
        section.setSortOrder(request.getSortOrder());
        section.setIsActive(request.getIsActive());
        section.setSettings(request.getSettings());

        HomepageSection saved = sectionRepository.save(section);
        log.info("Created homepage section {} for store {}", saved.getId(), store.getId());

        return convertToDTO(saved);
    }

    @Transactional
    public HomepageSectionDTO updateSection(Long sectionId, HomepageSectionDTO updates) {
        HomepageSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        if (updates.getSortOrder() != null) {
            section.setSortOrder(updates.getSortOrder());
        }
        if (updates.getIsActive() != null) {
            section.setIsActive(updates.getIsActive());
        }
        if (updates.getSettings() != null) {
            section.setSettings(updates.getSettings());
        }

        HomepageSection saved = sectionRepository.save(section);
        log.info("Updated homepage section {}", sectionId);

        return convertToDTO(saved);
    }

    @Transactional
    public void deleteSection(Long sectionId) {
        sectionRepository.deleteById(sectionId);
        log.info("Deleted homepage section {}", sectionId);
    }

    @Transactional
    public void reorderSections(Long storeId, List<Long> sectionIds) {
        for (int i = 0; i < sectionIds.size(); i++) {
            Long sectionId = sectionIds.get(i);
            final int sortOrder = i; // Make effectively final for lambda
            sectionRepository.findById(sectionId).ifPresent(section -> {
                if (section.getStore().getId().equals(storeId)) {
                    section.setSortOrder(sortOrder);
                    sectionRepository.save(section);
                }
            });
        }
        log.info("Reordered sections for store {}", storeId);
    }

    private HomepageSectionDTO convertToDTO(HomepageSection section) {
        HomepageSectionDTO dto = new HomepageSectionDTO();
        dto.setId(section.getId());
        dto.setStoreId(section.getStore().getId());
        dto.setSectionType(section.getSectionType());
        dto.setSortOrder(section.getSortOrder());
        dto.setIsActive(section.getIsActive());
        dto.setSettings(section.getSettings());
        dto.setCreatedAt(section.getCreatedAt());
        dto.setUpdatedAt(section.getUpdatedAt());
        return dto;
    }
}

