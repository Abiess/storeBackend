package storebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateThemeRequest;
import storebackend.dto.StoreThemeDTO;
import storebackend.entity.Store;
import storebackend.entity.StoreTheme;
import storebackend.repository.StoreRepository;
import storebackend.repository.StoreThemeRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThemeService {

    private final StoreThemeRepository themeRepository;
    private final StoreRepository storeRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public StoreThemeDTO getActiveTheme(Long storeId) {
        return themeRepository.findByStoreIdAndIsActive(storeId, true)
                .map(this::convertToDTO)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<StoreThemeDTO> getStoreThemes(Long storeId) {
        return themeRepository.findByStoreId(storeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public StoreThemeDTO createTheme(CreateThemeRequest request) {
        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new RuntimeException("Store not found"));

        // ✅ FIX: Prüfe ob bereits IRGENDEIN Theme für diesen Store existiert (UPSERT-Logik)
        // Verhindert UNIQUE-Constraint-Verletzung wenn store_id UNIQUE ist
        List<StoreTheme> existingThemes = themeRepository.findByStoreId(request.getStoreId());
        
        StoreTheme theme;
        if (!existingThemes.isEmpty()) {
            // Update das erste/aktive existierende Theme
            theme = existingThemes.stream()
                    .filter(StoreTheme::getIsActive)
                    .findFirst()
                    .orElse(existingThemes.get(0));
            log.info("Updating existing theme {} for store {}", theme.getId(), request.getStoreId());
        } else {
            // Kein Theme vorhanden → Erstelle neues
            log.info("Creating new theme for store {}", request.getStoreId());
            theme = new StoreTheme();
            theme.setStore(store);
            theme.setIsActive(true);
        }

        // Aktualisiere Theme-Daten
        theme.setName(request.getName());
        theme.setType(request.getType());
        theme.setTemplate(request.getTemplate());
        theme.setColorsJson(request.getColorsJson());
        theme.setTypographyJson(request.getTypographyJson());
        theme.setLayoutJson(request.getLayoutJson());
        theme.setCustomCss(request.getCustomCss());
        theme.setLogoUrl(request.getLogoUrl());
        theme.setIsActive(true);

        StoreTheme savedTheme = themeRepository.save(theme);
        log.info("✅ Saved theme {} for store {} ({})", 
                 savedTheme.getId(), 
                 store.getId(), 
                 existingThemes.isEmpty() ? "created" : "updated");

        return convertToDTO(savedTheme);
    }

    @Transactional
    public StoreThemeDTO updateTheme(Long themeId, StoreThemeDTO updates) {
        StoreTheme theme = themeRepository.findById(themeId)
                .orElseThrow(() -> new RuntimeException("Theme not found"));

        if (updates.getName() != null) {
            theme.setName(updates.getName());
        }
        if (updates.getType() != null) {
            theme.setType(updates.getType());
        }
        if (updates.getTemplate() != null) {
            theme.setTemplate(updates.getTemplate());
        }
        if (updates.getColorsJson() != null) {
            theme.setColorsJson(updates.getColorsJson());
        }
        if (updates.getTypographyJson() != null) {
            theme.setTypographyJson(updates.getTypographyJson());
        }
        if (updates.getLayoutJson() != null) {
            theme.setLayoutJson(updates.getLayoutJson());
        }
        if (updates.getCustomCss() != null) {
            theme.setCustomCss(updates.getCustomCss());
        }
        if (updates.getLogoUrl() != null) {
            theme.setLogoUrl(updates.getLogoUrl());
        }

        StoreTheme savedTheme = themeRepository.save(theme);
        log.info("Updated theme {}", themeId);

        return convertToDTO(savedTheme);
    }

    @Transactional
    public void activateTheme(Long themeId) {
        StoreTheme theme = themeRepository.findById(themeId)
                .orElseThrow(() -> new RuntimeException("Theme not found"));

        // Deaktiviere alle anderen Themes des Stores
        themeRepository.findByStoreId(theme.getStore().getId()).stream()
                .filter(t -> !t.getId().equals(themeId) && t.getIsActive())
                .forEach(t -> {
                    t.setIsActive(false);
                    themeRepository.save(t);
                });

        theme.setIsActive(true);
        themeRepository.save(theme);
        log.info("Activated theme {} for store {}", themeId, theme.getStore().getId());
    }

    @Transactional
    public void deleteTheme(Long themeId) {
        themeRepository.deleteById(themeId);
        log.info("Deleted theme {}", themeId);
    }

    private StoreThemeDTO convertToDTO(StoreTheme theme) {
        StoreThemeDTO dto = new StoreThemeDTO();
        dto.setId(theme.getId());
        dto.setStoreId(theme.getStore().getId());
        dto.setName(theme.getName());
        dto.setType(theme.getType());
        dto.setTemplate(theme.getTemplate());
        dto.setColorsJson(theme.getColorsJson());
        dto.setTypographyJson(theme.getTypographyJson());
        dto.setLayoutJson(theme.getLayoutJson());
        dto.setCustomCss(theme.getCustomCss());
        dto.setLogoUrl(theme.getLogoUrl());
        dto.setIsActive(theme.getIsActive());
        dto.setCreatedAt(theme.getCreatedAt());
        dto.setUpdatedAt(theme.getUpdatedAt());
        return dto;
    }
}
