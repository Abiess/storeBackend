package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO für Store-Banner-Konfiguration.
 * Über GET /api/stores/{id}/banner und GET /api/public/stores/{id}/banner abrufbar.
 * Über PUT /api/stores/{id}/banner aktualisierbar (Admin).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreBannerSettingsDTO {

    private Long storeId;
    private boolean enabled;

    /** "top" oder "bottom" */
    private String position;

    /** CSS-Farbe, z.B. "#667eea" */
    private String bgColor;

    /** CSS-Farbe, z.B. "#ffffff" */
    private String textColor;

    /**
     * Animationsgeschwindigkeit in px/s. 0 = statisch.
     */
    private int animationSpeed;

    /**
     * Mehrsprachige Texte.
     * Key = Sprachcode (de/en/ar), Value = Bannertext dieser Sprache.
     */
    private Map<String, String> texts;

    /** Optionales Icon/Emoji (z.B. "🔥") */
    private String icon;

    private LocalDateTime updatedAt;
}

