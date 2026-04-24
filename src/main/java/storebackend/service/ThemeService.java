package storebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateThemeRequest;
import storebackend.dto.StoreThemeDTO;
import storebackend.dto.ThemeTemplateDTO;
import storebackend.entity.Store;
import storebackend.entity.StoreTheme;
import storebackend.entity.ThemeTemplate;
import storebackend.repository.StoreRepository;
import storebackend.repository.StoreThemeRepository;
import storebackend.repository.ThemeTemplateRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThemeService {

    private final StoreThemeRepository themeRepository;
    private final StoreRepository storeRepository;
    private final ThemeTemplateRepository themeTemplateRepository;
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

    // =====================================================================
    // Theme-Template-Katalog (Free + Premium Vorlagen)
    // =====================================================================

    @Transactional(readOnly = true)
    public List<ThemeTemplateDTO> listTemplates(boolean onlyFree) {
        List<ThemeTemplate> templates = onlyFree
                ? themeTemplateRepository.findByIsFreeTrueAndIsActiveTrueOrderBySortOrderAscIdAsc()
                : themeTemplateRepository.findByIsActiveTrueOrderBySortOrderAscIdAsc();
        return templates.stream().map(this::convertTemplateToDTO).collect(Collectors.toList());
    }

    /**
     * 1-Klick-Anwendung: Übernimmt eine Template-Vorlage als aktives Theme
     * eines Stores. Falls bereits ein Theme existiert, wird es überschrieben
     * (UPSERT-Verhalten – konsistent mit createTheme()).
     */
    @Transactional
    public StoreThemeDTO applyTemplateToStore(Long storeId, Long templateId, String customName) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));
        ThemeTemplate template = themeTemplateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Template not found: " + templateId));

        if (Boolean.FALSE.equals(template.getIsActive())) {
            throw new RuntimeException("Template ist deaktiviert: " + template.getCode());
        }

        List<StoreTheme> existing = themeRepository.findByStoreId(storeId);
        StoreTheme theme = existing.stream()
                .filter(StoreTheme::getIsActive)
                .findFirst()
                .orElseGet(() -> existing.isEmpty() ? new StoreTheme() : existing.get(0));

        theme.setStore(store);
        theme.setName(customName != null && !customName.isBlank()
                ? customName : template.getName() + " Theme");
        theme.setType(template.getType());
        theme.setTemplate(template.getTemplate());
        theme.setColorsJson(template.getColorsJson());
        theme.setTypographyJson(template.getTypographyJson());
        theme.setLayoutJson(template.getLayoutJson());
        if (template.getCustomCss() != null) {
            theme.setCustomCss(template.getCustomCss());
        }
        theme.setIsActive(true);

        // Andere Themes deaktivieren
        existing.stream()
                .filter(t -> t.getId() != null && !t.getId().equals(theme.getId()) && Boolean.TRUE.equals(t.getIsActive()))
                .forEach(t -> {
                    t.setIsActive(false);
                    themeRepository.save(t);
                });

        StoreTheme saved = themeRepository.save(theme);
        log.info("✅ Template '{}' auf Store {} angewendet (Theme ID {})",
                template.getCode(), storeId, saved.getId());
        return convertToDTO(saved);
    }

    private ThemeTemplateDTO convertTemplateToDTO(ThemeTemplate t) {
        ThemeTemplateDTO dto = new ThemeTemplateDTO();
        dto.setId(t.getId());
        dto.setCode(t.getCode());
        dto.setName(t.getName());
        dto.setDescription(t.getDescription());
        dto.setType(t.getType());
        dto.setTemplate(t.getTemplate());
        dto.setPreviewUrl(t.getPreviewUrl());
        dto.setColorsJson(t.getColorsJson());
        dto.setTypographyJson(t.getTypographyJson());
        dto.setLayoutJson(t.getLayoutJson());
        dto.setCustomCss(t.getCustomCss());
        dto.setIsFree(t.getIsFree());
        dto.setSortOrder(t.getSortOrder());
        return dto;
    }
}
