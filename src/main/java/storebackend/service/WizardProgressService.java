package storebackend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.WizardProgressDTO;
import storebackend.entity.User;
import storebackend.entity.WizardProgress;
import storebackend.repository.UserRepository;
import storebackend.repository.WizardProgressRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service für Store-Creation-Wizard Fortschritt
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WizardProgressService {

    private final WizardProgressRepository wizardProgressRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Hole Wizard-Fortschritt für User
     */
    public Optional<WizardProgressDTO> getProgress(Long userId) {
        return wizardProgressRepository.findByUserId(userId)
                .map(this::toDTO);
    }

    /**
     * Speichere/Update Wizard-Fortschritt
     */
    @Transactional
    public WizardProgressDTO saveProgress(Long userId, WizardProgressDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        WizardProgress progress = wizardProgressRepository.findByUserId(userId)
                .orElse(new WizardProgress());

        progress.setUser(user);
        progress.setCurrentStep(dto.getCurrentStep());
        progress.setStatus(dto.getStatus());
        
        // Serialize wizard data to JSON
        try {
            if (dto.getData() != null) {
                progress.setWizardData(objectMapper.writeValueAsString(dto.getData()));
            }
            if (dto.getCompletedSteps() != null) {
                progress.setCompletedSteps(objectMapper.writeValueAsString(dto.getCompletedSteps()));
            }
        } catch (JsonProcessingException e) {
            log.error("Error serializing wizard data", e);
            throw new RuntimeException("Failed to save wizard progress", e);
        }

        if (dto.getStoreCreated() != null) {
            progress.setStoreCreated(dto.getStoreCreated());
        }
        if (dto.getCreatedStoreId() != null) {
            progress.setCreatedStoreId(dto.getCreatedStoreId());
        }

        WizardProgress saved = wizardProgressRepository.save(progress);
        log.info("✅ Wizard progress saved for user {}: Step {}, Status {}", 
                userId, saved.getCurrentStep(), saved.getStatus());
        
        return toDTO(saved);
    }

    /**
     * Markiere Wizard als übersprungen
     */
    @Transactional
    public void markAsSkipped(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        WizardProgress progress = wizardProgressRepository.findByUserId(userId)
                .orElse(new WizardProgress());

        progress.setUser(user);
        progress.markAsSkipped();
        wizardProgressRepository.save(progress);
        
        log.info("⏭️ Wizard skipped by user {}", userId);
    }

    /**
     * Markiere Wizard als abgeschlossen nach Store-Erstellung
     */
    @Transactional
    public void markAsCompleted(Long userId, Long storeId) {
        wizardProgressRepository.findByUserId(userId).ifPresent(progress -> {
            progress.markAsCompleted();
            progress.setStoreCreated(true);
            progress.setCreatedStoreId(storeId);
            wizardProgressRepository.save(progress);
            
            log.info("✅ Wizard completed for user {} - Store {} created", userId, storeId);
        });
    }

    /**
     * Lösche Wizard-Fortschritt (nach Abschluss optional)
     */
    @Transactional
    public void deleteProgress(Long userId) {
        wizardProgressRepository.deleteByUserId(userId);
        log.info("🗑️ Wizard progress deleted for user {}", userId);
    }

    /**
     * Prüfe ob User einen aktiven Wizard-Fortschritt hat
     */
    public boolean hasActiveProgress(Long userId) {
        return wizardProgressRepository.findByUserId(userId)
                .map(WizardProgress::isInProgress)
                .orElse(false);
    }

    /**
     * Konvertiere Entity zu DTO
     */
    private WizardProgressDTO toDTO(WizardProgress entity) {
        WizardProgressDTO dto = new WizardProgressDTO();
        dto.setId(entity.getId());
        dto.setUserId(entity.getUser().getId());
        dto.setCurrentStep(entity.getCurrentStep());
        dto.setStatus(entity.getStatus());
        dto.setLastUpdated(entity.getLastUpdated());
        dto.setStoreCreated(entity.getStoreCreated());
        dto.setCreatedStoreId(entity.getCreatedStoreId());

        // Deserialize JSON data
        try {
            if (entity.getWizardData() != null && !entity.getWizardData().isEmpty()) {
                dto.setData(objectMapper.readValue(
                        entity.getWizardData(), 
                        WizardProgressDTO.WizardDataDTO.class
                ));
            }
            if (entity.getCompletedSteps() != null && !entity.getCompletedSteps().isEmpty()) {
                dto.setCompletedSteps(objectMapper.readValue(
                        entity.getCompletedSteps(), 
                        new TypeReference<List<Integer>>() {}
                ));
            } else {
                dto.setCompletedSteps(new ArrayList<>());
            }
        } catch (JsonProcessingException e) {
            log.error("Error deserializing wizard data", e);
            dto.setCompletedSteps(new ArrayList<>());
        }

        return dto;
    }
}

