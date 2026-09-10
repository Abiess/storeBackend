package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import storebackend.dto.MarineWeatherDTO;
import storebackend.enums.MaritimePort;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Marine-Wetter-/Ozean-Modelldaten für die Maritime-Seite (Open-Meteo Marine API, öffentlich,
 * kein API-Key nötig). Ergänzt die bestehende AISStream-Live-Vessel-Integration um zusätzliche
 * Kontext-Daten (Wellen, Strömung, Meeresspiegel) für den jeweils aktuell ausgewählten Hafen.
 *
 * WICHTIG: Komplett unabhängig von {@link AisStreamClientService} – kein Einfluss auf die
 * AISStream-WebSocket-Verbindung/-Subscription. Ein Ausfall von Open-Meteo darf die AIS-Funktion
 * niemals beeinträchtigen: Fehler werden hier abgefangen und nie als Exception nach oben
 * durchgereicht (siehe {@link #getWeather(MaritimePort)}).
 *
 * Caching: pro Hafen ein einfacher In-Memory-TTL-Cache ({@link ConcurrentHashMap}, Schlüssel =
 * {@link MaritimePort}-Enum, also von Natur aus auf die Anzahl unterstützter Häfen begrenzt).
 * So wird verhindert, dass das bestehende 8-Sekunden-AIS-Polling im Frontend bei jedem Tick auch
 * Open-Meteo aufruft – Marine-Wetter ändert sich nicht im Sekundentakt.
 *
 * Quelle/Feldnamen: https://marine-api.open-meteo.com/v1/marine (live gegen die API geprüft,
 * "current"-Block liefert genau einen aktuellen Wert je Parameter statt eines stündlichen Arrays).
 */
@Service
@Slf4j
public class MarineWeatherService {

    private static final String API_URL = "https://marine-api.open-meteo.com/v1/marine";

    /** Marine-Wetter ändert sich nicht im Sekundentakt – 20 Minuten TTL (Vorgabe: 10-30 Minuten). */
    private static final Duration CACHE_TTL = Duration.ofMinutes(20);

    /** Von Open-Meteo tatsächlich unterstützte "current"-Parameter (Feldnamen 1:1 wie API-Doku, nicht geraten). */
    private static final String CURRENT_PARAMS = String.join(",",
            "wave_height", "wave_direction", "wave_period",
            "swell_wave_height", "swell_wave_direction", "swell_wave_period",
            "sea_surface_temperature",
            "ocean_current_velocity", "ocean_current_direction",
            "sea_level_height_msl");

    private final RestTemplate restTemplate;

    /** Pro Hafen höchstens ein Eintrag – Größe ist durch die Anzahl der MaritimePort-Werte begrenzt (kein unbounded Cache). */
    private final ConcurrentHashMap<MaritimePort, CachedWeather> cache = new ConcurrentHashMap<>();

    public MarineWeatherService(RestTemplateBuilder restTemplateBuilder) {
        // Eigene RestTemplate-Instanz mit Timeouts (statt des global geteilten Beans ohne Timeout,
        // siehe WebConfig#restTemplate) – ein hängender externer Call darf keinen Thread blockieren.
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(4))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Liefert Marine-Wetter für den angegebenen Hafen – aus dem Cache, falls innerhalb der TTL,
     * sonst frisch von Open-Meteo. Wirft NIE eine Exception: bei Fehlern wird ein evtl. noch
     * vorhandener (dann veralteter) Cache-Wert zurückgegeben, sonst ein DTO mit
     * {@code available=false} (Frontend zeigt dann "vorübergehend nicht verfügbar").
     */
    public MarineWeatherDTO getWeather(MaritimePort port) {
        CachedWeather cached = cache.get(port);
        if (cached != null && Duration.between(cached.fetchedAt(), Instant.now()).compareTo(CACHE_TTL) < 0) {
            return cached.dto();
        }
        try {
            MarineWeatherDTO fresh = fetch(port);
            cache.put(port, new CachedWeather(fresh, Instant.now()));
            return fresh;
        } catch (Exception e) {
            // Kein Rohresponse-/Stacktrace-Logging (kein Log-Spam) – maximal Provider, Port, HTTP-Status, Kurzfehler.
            String status = (e instanceof RestClientResponseException rcre) ? String.valueOf(rcre.getStatusCode().value()) : "n/a";
            log.warn("Marine weather fetch failed (provider=Open-Meteo, port={}, httpStatus={}): {}", port, status, e.getMessage());
            if (cached != null) {
                // Stale-Markierung nur für DIESE Response, der Cache-Eintrag selbst bleibt unverändert
                // (fetchedAt bleibt der letzte tatsächliche Erfolgs-Zeitpunkt für die "last updated"-Anzeige).
                return cached.dto().toBuilder().stale(true).build();
            }
            return unavailable(port);
        }
    }

    private MarineWeatherDTO fetch(MaritimePort port) {
        double[] center = port.getCenter();
        String url = UriComponentsBuilder.fromHttpUrl(API_URL)
                .queryParam("latitude", center[0])
                .queryParam("longitude", center[1])
                .queryParam("current", CURRENT_PARAMS)
                .queryParam("timezone", "UTC")
                .toUriString();

        ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
        JsonNode body = response.getBody();
        JsonNode current = body != null ? body.get("current") : null;
        if (current == null) {
            throw new RestClientException("Open-Meteo response missing 'current' block");
        }
        // current_units wird ausgewertet statt die Einheit hartkodiert anzunehmen (siehe currentVelocityMs unten).
        JsonNode units = body.get("current_units");

        Double currentVelocityRaw = doubleOrNull(current, "ocean_current_velocity");
        Double currentVelocityMs = toMetersPerSecond(currentVelocityRaw, textOrNull(units, "ocean_current_velocity"), port);

        Instant now = Instant.now();
        return MarineWeatherDTO.builder()
                .port(port.name())
                .latitude(center[0])
                .longitude(center[1])
                .forecastTime(textOrNull(current, "time"))
                .waveHeightM(doubleOrNull(current, "wave_height"))
                .waveDirectionDeg(doubleOrNull(current, "wave_direction"))
                .wavePeriodS(doubleOrNull(current, "wave_period"))
                .swellHeightM(doubleOrNull(current, "swell_wave_height"))
                .swellDirectionDeg(doubleOrNull(current, "swell_wave_direction"))
                .swellPeriodS(doubleOrNull(current, "swell_wave_period"))
                .seaSurfaceTemperatureC(doubleOrNull(current, "sea_surface_temperature"))
                .currentVelocityMs(currentVelocityMs)
                .currentDirectionDeg(doubleOrNull(current, "ocean_current_direction"))
                .seaLevelHeightM(doubleOrNull(current, "sea_level_height_msl"))
                .source("Open-Meteo Marine API")
                .modelBased(true)
                .available(true)
                .fetchedAt(now)
                .stale(false)
                .build();
    }

    /**
     * Rechnet {@code ocean_current_velocity} anhand der vom Response gemeldeten Einheit
     * ({@code current_units.ocean_current_velocity}) nach m/s um – NICHT anhand einer hartkodierten
     * Annahme. Bekannt/geprüft: Open-Meteo liefert aktuell "km/h" (÷3.6). Liefert die API bereits
     * "m/s", wird nicht umgerechnet. Bei unbekannter/fehlender Einheit wird der Rohwert unverändert
     * durchgereicht und einmalig gewarnt, damit eine künftige API-Änderung nicht unbemerkt zu falschen
     * Werten führt.
     */
    private Double toMetersPerSecond(Double rawValue, String unit, MaritimePort port) {
        if (rawValue == null) {
            return null;
        }
        if (unit == null) {
            log.warn("Marine weather: ocean_current_velocity unit missing in response (port={}), using raw value unconverted", port);
            return rawValue;
        }
        return switch (unit) {
            case "km/h" -> round2(rawValue / 3.6);
            case "m/s" -> rawValue;
            default -> {
                log.warn("Marine weather: unexpected ocean_current_velocity unit '{}' (port={}), using raw value unconverted", unit, port);
                yield rawValue;
            }
        };
    }

    private MarineWeatherDTO unavailable(MaritimePort port) {
        double[] center = port.getCenter();
        return MarineWeatherDTO.builder()
                .port(port.name())
                .latitude(center[0])
                .longitude(center[1])
                .source("Open-Meteo Marine API")
                .modelBased(true)
                .available(false)
                .stale(false)
                .build();
    }

    private static Double doubleOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value == null || value.isNull()) ? null : value.asDouble();
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value == null || value.isNull()) ? null : value.asText();
    }

    private static Double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record CachedWeather(MarineWeatherDTO dto, Instant fetchedAt) {
    }
}
