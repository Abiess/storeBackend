package storebackend.dto;

import lombok.Data;

import java.util.List;

/**
 * Request-Body für POST /api/assets/suggestions/apply.
 * Enthält die vom User ausgewählten Unsplash-Bilder, die in MinIO gespeichert
 * und dem Store-Slider hinzugefügt werden sollen.
 */
@Data
public class UnsplashApplyRequest {

    /** ID des Ziel-Stores */
    private Long storeId;

    /**
     * Wohin die Bilder hinzugefügt werden sollen.
     * Aktuell unterstützt: "SLIDER"
     */
    private String target = "SLIDER";

    /** Vom User ausgewählte Bilder */
    private List<SelectedImage> images;

    @Data
    public static class SelectedImage {
        /** Unsplash Download-Location (Pflicht – wird für API-Tracking aufgerufen) */
        private String downloadLocation;

        /** Reguläre Bild-URL (1080px, wird nach MinIO heruntergeladen) */
        private String regularUrl;

        /** Bildbeschreibung / Alt-Text */
        private String description;
    }
}
