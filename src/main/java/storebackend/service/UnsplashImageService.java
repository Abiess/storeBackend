package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import storebackend.config.UnsplashProperties;
import storebackend.dto.UnsplashImageDTO;
import storebackend.enums.BusinessType;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Service für Unsplash-Bildvorschläge im Create-Store-Wizard.
 *
 * Wichtige Unsplash API-Pflichten:
 * 1. Jeder Download MUSS über {@link #triggerDownload(String)} gemeldet werden.
 * 2. Das Frontend MUSS "Photo by {authorName} on Unsplash" anzeigen.
 * 3. Der Access-Key darf NIEMALS ins Frontend gelangen.
 *
 * Docs: https://unsplash.com/documentation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UnsplashImageService {

    private final RestTemplate restTemplate;
    private final UnsplashProperties unsplashProperties;

    /** Standard-Suchbegriffe je BusinessType (Deutsch/Arabisch-optimiert für Marokko) */
    private static final Map<BusinessType, String> DEFAULT_QUERIES = Map.of(
        BusinessType.RIAD,       "riad moroccan patio architecture",
        BusinessType.RESTAURANT, "moroccan restaurant food tagine",
        BusinessType.SHOP,       "boutique shop retail interior"
    );

    /**
     * Sucht passende Bilder auf Unsplash.
     *
     * @param businessType Geschäftstyp – bestimmt den Default-Suchbegriff
     * @param customQuery  optionaler benutzerdefinierter Suchbegriff (überschreibt Default)
     * @param page         Seite (1-basiert) für Paginierung
     * @return Liste von Bildvorschlägen; leere Liste wenn Unsplash nicht konfiguriert
     */
    public List<UnsplashImageDTO> searchPhotos(BusinessType businessType, String customQuery, int page) {
        if (!unsplashProperties.isConfigured()) {
            log.warn("[Unsplash] API-Key nicht konfiguriert – Bildvorschläge deaktiviert.");
            return List.of();
        }

        String query = (customQuery != null && !customQuery.isBlank())
            ? customQuery
            : DEFAULT_QUERIES.getOrDefault(businessType, "store retail shop");

        String url = UriComponentsBuilder.fromHttpUrl(unsplashProperties.getBaseUrl() + "/search/photos")
            .queryParam("query", query)
            .queryParam("page", Math.max(1, page))
            .queryParam("per_page", unsplashProperties.getResultsPerPage())
            .queryParam("orientation", "landscape")
            .build()
            .toUriString();

        HttpHeaders headers = buildAuthHeaders();
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class
            );

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                log.warn("[Unsplash] Unerwarteter Status: {}", response.getStatusCode());
                return List.of();
            }

            return parseResults(response.getBody());
        } catch (Exception e) {
            log.error("[Unsplash] Fehler bei Bildsuche für query='{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    /**
     * Meldet einen User-Download an Unsplash (API-PFLICHT!).
     * Muss bei jeder Bildauswahl durch den User aufgerufen werden.
     *
     * @param downloadLocation die downloadLocation-URL aus {@link UnsplashImageDTO}
     */
    public void triggerDownload(String downloadLocation) {
        if (!unsplashProperties.isConfigured() || downloadLocation == null || downloadLocation.isBlank()) {
            return;
        }
        try {
            HttpHeaders headers = buildAuthHeaders();
            restTemplate.exchange(downloadLocation, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            log.debug("[Unsplash] Download-Tracking ausgelöst für: {}", downloadLocation);
        } catch (Exception e) {
            // Download-Tracking-Fehler darf den eigentlichen Bild-Download nicht blockieren
            log.warn("[Unsplash] Download-Tracking fehlgeschlagen (nicht kritisch): {}", e.getMessage());
        }
    }

    /** true wenn der Unsplash-Key konfiguriert ist */
    public boolean isConfigured() {
        return unsplashProperties.isConfigured();
    }

    private HttpHeaders buildAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Client-ID " + unsplashProperties.getKey());
        headers.setAcceptLanguage(List.of(new Locale.LanguageRange("en")));
        return headers;
    }

    private List<UnsplashImageDTO> parseResults(JsonNode root) {
        List<UnsplashImageDTO> results = new ArrayList<>();
        JsonNode results_node = root.path("results");
        if (!results_node.isArray()) return results;

        for (JsonNode photo : results_node) {
            try {
                UnsplashImageDTO dto = new UnsplashImageDTO();
                dto.setId(photo.path("id").asText());

                // Beschreibung: description bevorzugen, dann alt_description als Fallback
                String desc = photo.path("description").asText(null);
                if (desc == null || desc.isBlank()) {
                    desc = photo.path("alt_description").asText("");
                }
                dto.setDescription(desc);

                JsonNode urls = photo.path("urls");
                dto.setThumbUrl(urls.path("small").asText(""));
                dto.setRegularUrl(urls.path("regular").asText(""));

                JsonNode user = photo.path("user");
                dto.setAuthorName(user.path("name").asText(""));

                // Unsplash-Profil-Link mit UTM-Parametern (Pflicht per Unsplash-Guidelines)
                String profileUrl = user.path("links").path("html").asText("");
                if (!profileUrl.isBlank()) {
                    profileUrl += "?utm_source=markt_ma&utm_medium=referral";
                }
                dto.setAuthorUrl(profileUrl);

                dto.setDownloadLocation(photo.path("links").path("download_location").asText(""));

                if (!dto.getRegularUrl().isBlank()) {
                    results.add(dto);
                }
            } catch (Exception e) {
                log.warn("[Unsplash] Fehler beim Parsen eines Foto-Eintrags: {}", e.getMessage());
            }
        }
        return results;
    }
}
