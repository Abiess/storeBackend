package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Repräsentiert einen Unsplash-Bildvorschlag für den Create-Store-Wizard.
 *
 * Attribution-Felder (authorName, authorUrl) sind nach den Unsplash API-Guidelines
 * PFLICHT – das Frontend muss "Photo by {authorName} on Unsplash" anzeigen.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnsplashImageDTO {

    /** Unsplash-interne Bild-ID */
    private String id;

    /** Kurze Bildbeschreibung (kann null sein) */
    private String description;

    /** Vorschau-URL (klein, für Grid-Anzeige, ~400px breit) */
    private String thumbUrl;

    /** Reguläre URL (für Download + Speicherung in MinIO, ~1080px breit) */
    private String regularUrl;

    /** Name des Fotografen (muss im Frontend angezeigt werden – Unsplash-Pflicht!) */
    private String authorName;

    /** Unsplash-Profillink des Fotografen (muss klickbar sein – Unsplash-Pflicht!) */
    private String authorUrl;

    /**
     * Unsplash Download-Location – MUSS bei jeder Auswahl durch den User aufgerufen werden.
     * Unsplash-Pflicht: Verstoss führt zur API-Sperrung.
     * Format: https://api.unsplash.com/photos/{id}/download?ixid=...
     */
    private String downloadLocation;
}
