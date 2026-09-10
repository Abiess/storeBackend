package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Marine-Wetter-/Ozean-Modelldaten (Open-Meteo Marine API) für den aktuell ausgewählten Hafen.
 *
 * WICHTIG (Genauigkeit): Dies sind Modell-/Forecast-Daten, KEINE amtlichen Hafenmessungen,
 * hydrographischen Daten, nautischen Karten oder Navigationsdaten. Insbesondere küstennahe Werte
 * (Wellen, Strömung, Meeresspiegel) können wegen Modellauflösung und lokaler Hafen-Geometrie
 * deutlich von realen Messwerten abweichen. Nur als Zusatz-/Orientierungsinformation für das
 * Operations-Dashboard gedacht – NICHT für Navigation oder sicherheitskritische Entscheidungen
 * (siehe auch {@code maritime.weather.disclaimer} im Frontend-i18n).
 *
 * Quelle: https://marine-api.open-meteo.com/v1/marine ("current"-Block), Felder 1:1 wie von der
 * API benannt/skaliert, bis auf {@link #currentVelocityMs} (von km/h nach m/s umgerechnet).
 * Alle Werte nullable, falls Open-Meteo für ein Feld/Ort gerade nichts liefert.
 */
@Getter
@Setter
@Builder(toBuilder = true)
@AllArgsConstructor
public class MarineWeatherDTO {
    /** Hafen-ID, z. B. "TANGER_MED" (siehe {@link storebackend.enums.MaritimePort}). */
    private String port;
    private double latitude;
    private double longitude;
    /**
     * UTC-Zeitstempel des von Open-Meteo gelieferten "current"-Werts (ISO8601 ohne Zeitzonen-Suffix),
     * z. B. "2026-09-10T22:00". Bewusst NICHT "observedAt" genannt: Open-Meteo liefert Modell-/
     * Forecast-Daten, keine Messung – siehe Klassen-Doku.
     */
    private String forecastTime;

    private Double waveHeightM;
    private Double waveDirectionDeg;
    private Double wavePeriodS;

    private Double swellHeightM;
    private Double swellDirectionDeg;
    private Double swellPeriodS;

    private Double seaSurfaceTemperatureC;

    /**
     * Von Open-Meteo {@code ocean_current_velocity} nach m/s umgerechnet – ABER nur, wenn die vom
     * Response tatsächlich gemeldete Einheit ({@code current_units.ocean_current_velocity}) "km/h"
     * ist (÷3.6). Liefert die API bereits "m/s", erfolgt keine Umrechnung. Die Einheit wird also aus
     * dem Response ausgelesen statt hartkodiert angenommen (siehe MarineWeatherService#fetch).
     */
    private Double currentVelocityMs;
    private Double currentDirectionDeg;

    /** Open-Meteo {@code sea_level_height_msl} – modellierte Abweichung vom mittleren Meeresspiegel, KEINE Gezeiten-/Tide-Angabe. */
    private Double seaLevelHeightM;

    private String source;
    /** Immer {@code true} – Kennzeichnung als Modell-/Forecast-Daten für das Frontend. */
    private boolean modelBased;
    /** {@code false} = Open-Meteo aktuell nicht erreichbar UND kein (auch kein veralteter) Cache-Wert vorhanden. */
    private boolean available;
    /** Zeitpunkt, zu dem diese Daten zuletzt erfolgreich von Open-Meteo geladen wurden (für "last updated" im Frontend). */
    private java.time.Instant fetchedAt;
    /** {@code true} = ein Refresh ist gerade fehlgeschlagen, es wird ein älterer (über-TTL) Cache-Stand angezeigt. */
    private boolean stale;
}

