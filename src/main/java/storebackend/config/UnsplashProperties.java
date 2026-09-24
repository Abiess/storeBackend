package storebackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Konfiguration für die Unsplash API (Bildvorschläge im Create-Store-Wizard).
 *
 * Der API-Key wird AUSSCHLIESSLICH serverseitig verwendet – er darf niemals
 * ins Angular-Frontend oder in Git gelangen.
 *
 * Key anlegen: https://unsplash.com/developers
 * Produktions-Key aktivieren (5.000 req/h statt 50 Demo-req/h) über den Unsplash-Support.
 */
@Configuration
@ConfigurationProperties(prefix = "unsplash.api")
@Data
public class UnsplashProperties {

    /**
     * Unsplash Access Key (Demo: 50 req/h, Production: 5.000 req/h).
     * Wird via ENV-Variable {@code UNSPLASH_ACCESS_KEY} gesetzt.
     */
    private String key = "";

    /** Unsplash API Basis-URL */
    private String baseUrl = "https://api.unsplash.com";

    /** Anzahl Bildvorschläge pro Suche */
    private int resultsPerPage = 12;

    /** true wenn ein gültiger Key konfiguriert ist */
    public boolean isConfigured() {
        return key != null && !key.isBlank();
    }
}
