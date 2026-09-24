package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregierte Nutzungs-Statistiken eines Users im Verhältnis zu seinem Plan-Limit.
 * <p>
 * Konvention: {@code limit = -1} bedeutet "unbegrenzt".
 * Das Frontend rendert dann ∞ statt eines Progress-Bars.
 * </p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsageStatsDTO {

    /** Plan-Name (FREE / PRO / ENTERPRISE) */
    private String plan;

    private UsageItem stores;
    private UsageItem products;
    /** Speicher in MB */
    private UsageItem storageMb;
    private UsageItem customDomains;
    private UsageItem subdomains;
    /** AI-Calls (z.B. Bildgenerierung) im aktuellen Monat */
    private UsageItem aiCallsThisMonth;
    /** Anzahl Endkunden (eingeloggte Käufer) – ohne Limit */
    private UsageItem customers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageItem {
        /** Aktuell verbrauchter Wert. */
        private long used;
        /** Plan-Limit; -1 = unbegrenzt; null = nicht limitiert (z.B. Customers). */
        private Integer limit;
        /** Convenience: Prozent (0–100). Bei limit=-1 oder limit=null = null. */
        private Integer percent;
    }
}

