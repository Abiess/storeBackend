package storebackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.StoreBannerSettingsDTO;
import storebackend.entity.Store;
import storebackend.entity.StoreBannerSettings;
import storebackend.repository.StoreBannerSettingsRepository;
import storebackend.repository.StoreRepository;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreBannerService {

    private final StoreBannerSettingsRepository bannerRepo;
    private final StoreRepository storeRepo;
    private final ObjectMapper objectMapper;

    /**
     * Lädt die Banner-Einstellungen für einen Store.
     * Existiert kein Store oder kein Eintrag → werden Default-Werte zurückgegeben (NICHT persistiert).
     * Rückwärtskompatibel: Alte Stores ohne Banner-Eintrag erhalten enabled=false.
     */
    @Transactional(readOnly = true)
    public StoreBannerSettingsDTO getBanner(Long storeId) {
        // Store existiert überhaupt nicht: sicher Default zurückgeben statt Exception
        if (!storeRepo.existsById(storeId)) {
            log.debug("[Banner] Store {} nicht gefunden – gebe Default zurück", storeId);
            return buildDefault(storeId);
        }
        return bannerRepo.findByStoreId(storeId)
                .map(this::toDto)
                .orElseGet(() -> buildDefault(storeId));
    }

    /**
     * Speichert oder aktualisiert die Banner-Einstellungen (Upsert).
     */
    @Transactional
    public StoreBannerSettingsDTO upsertBanner(Long storeId, StoreBannerSettingsDTO dto) {
        Store store = storeRepo.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));

        StoreBannerSettings entity = bannerRepo.findByStoreId(storeId)
                .orElseGet(() -> {
                    StoreBannerSettings s = new StoreBannerSettings();
                    s.setStore(store);
                    // Explizit setzen – wichtig für @MapsId damit save() korrekt arbeitet
                    s.setStoreId(store.getId());
                    return s;
                });

        entity.setEnabled(dto.isEnabled());
        entity.setPosition(dto.getPosition() != null ? dto.getPosition() : "top");
        entity.setBgColor(dto.getBgColor() != null ? dto.getBgColor() : "#667eea");
        entity.setTextColor(dto.getTextColor() != null ? dto.getTextColor() : "#ffffff");
        entity.setAnimationSpeed(dto.getAnimationSpeed() >= 0 ? dto.getAnimationSpeed() : 60);
        entity.setIcon(dto.getIcon());

        // Texte serialisieren
        if (dto.getTexts() != null && !dto.getTexts().isEmpty()) {
            entity.setTextsJson(toJson(dto.getTexts()));
        }

        return toDto(bannerRepo.save(entity));
    }

    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    private StoreBannerSettingsDTO toDto(StoreBannerSettings e) {
        StoreBannerSettingsDTO dto = new StoreBannerSettingsDTO();
        dto.setStoreId(e.getStoreId());
        dto.setEnabled(e.isEnabled());
        dto.setPosition(e.getPosition());
        dto.setBgColor(e.getBgColor());
        dto.setTextColor(e.getTextColor());
        dto.setAnimationSpeed(e.getAnimationSpeed());
        dto.setIcon(e.getIcon());
        dto.setUpdatedAt(e.getUpdatedAt());
        dto.setTexts(fromJson(e.getTextsJson()));
        return dto;
    }

    private StoreBannerSettingsDTO buildDefault(Long storeId) {
        StoreBannerSettingsDTO dto = new StoreBannerSettingsDTO();
        dto.setStoreId(storeId);
        dto.setEnabled(false);
        dto.setPosition("top");
        dto.setBgColor("#667eea");
        dto.setTextColor("#ffffff");
        dto.setAnimationSpeed(60);
        dto.setTexts(defaultTexts());
        return dto;
    }

    private Map<String, String> defaultTexts() {
        Map<String, String> t = new HashMap<>();
        t.put("de", "🎉 Du erhältst heute Rabatt auf ausgewählte Produkte!");
        t.put("en", "🎉 Get a discount on selected products today!");
        t.put("ar", "🎉 احصل على خصم على منتجات مختارة اليوم!");
        return t;
    }

    private String toJson(Map<String, String> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            log.error("Failed to serialize banner texts", e);
            return "{}";
        }
    }

    private Map<String, String> fromJson(String json) {
        if (json == null || json.isBlank()) return defaultTexts();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize banner texts: {}", json, e);
            return defaultTexts();
        }
    }
}

