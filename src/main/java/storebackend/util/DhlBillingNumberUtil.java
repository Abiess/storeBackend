package storebackend.util;

import lombok.extern.slf4j.Slf4j;

/**
 * DHL Billing Number Utility
 * 
 * Normalisiert und validiert DHL Abrechnungsnummern.
 * 
 * Format: 14 Ziffern (EKP + Verfahren + Teilnahme)
 * Beispiel: 63856291150101
 * 
 * Tolerante Eingabe:
 * - "6385629115 01 01" → "63856291150101"
 * - "6385 6291 15 01 01" → "63856291150101"
 * - "6385629115-01-01" → "63856291150101"
 * 
 * Security:
 * - Vollständige Nummer NICHT loggen
 * - Nur maskiert: **********0101 oder last4=0101
 */
@Slf4j
public class DhlBillingNumberUtil {
    
    private static final int EXPECTED_LENGTH = 14;
    private static final String MESSAGE_KEY_INVALID = "shipping.dhl.invalidBillingNumber";
    
    /**
     * Normalisiert eine DHL Abrechnungsnummer
     * Entfernt alle Nicht-Ziffern (Leerzeichen, Bindestriche, etc.)
     * 
     * @param billingNumber Raw Billing Number (kann Leerzeichen/Sonderzeichen enthalten)
     * @return Normalisierte Nummer (nur Ziffern) oder null wenn Input null/blank
     */
    public static String normalize(String billingNumber) {
        if (billingNumber == null || billingNumber.isBlank()) {
            return null;
        }
        
        // Entferne alle Nicht-Ziffern
        String normalized = billingNumber.replaceAll("[^0-9]", "");
        
        return normalized.isEmpty() ? null : normalized;
    }
    
    /**
     * Validiert eine normalisierte DHL Abrechnungsnummer
     * Prüft auf exakt 14 Ziffern
     * 
     * @param billingNumber Normalisierte Billing Number (nur Ziffern)
     * @throws IllegalArgumentException wenn Nummer ungültig ist (mit messageKey)
     */
    public static void validate(String billingNumber) {
        if (billingNumber == null || billingNumber.isBlank()) {
            throw new IllegalArgumentException(
                "DHL billing number is required. " +
                "Please provide a valid 14-digit billing number (EKP + Procedure + Participation). " +
                "messageKey: " + MESSAGE_KEY_INVALID
            );
        }
        
        // Prüfe ob nur Ziffern
        if (!billingNumber.matches("^\\d+$")) {
            throw new IllegalArgumentException(
                "DHL billing number must contain only digits after normalization. " +
                "Found: " + maskForLogging(billingNumber) + " " +
                "messageKey: " + MESSAGE_KEY_INVALID
            );
        }
        
        // Prüfe Länge
        if (billingNumber.length() != EXPECTED_LENGTH) {
            throw new IllegalArgumentException(
                "DHL billing number must be exactly 14 digits. " +
                "Found " + billingNumber.length() + " digits: " + maskForLogging(billingNumber) + " " +
                "messageKey: " + MESSAGE_KEY_INVALID
            );
        }
    }
    
    /**
     * Normalisiert und validiert eine DHL Abrechnungsnummer
     * Kombiniert normalize() und validate()
     * 
     * @param billingNumber Raw Billing Number (kann Leerzeichen/Sonderzeichen enthalten)
     * @return Saubere 14-stellige Nummer (nur Ziffern)
     * @throws IllegalArgumentException wenn Nummer ungültig ist
     */
    public static String normalizeAndValidate(String billingNumber) {
        // Normalisieren
        String normalized = normalize(billingNumber);
        
        // Validieren
        validate(normalized);
        
        log.debug("DHL billing number normalized: input={}, output={}", 
            maskForLogging(billingNumber),
            maskForLogging(normalized)
        );
        
        return normalized;
    }
    
    /**
     * Maskiert Abrechnungsnummer für Logs
     * Zeigt nur die letzten 4 Ziffern
     * 
     * @param billingNumber Billing Number (normalisiert oder raw)
     * @return Maskierte Nummer (z.B. "**********0101")
     */
    public static String maskForLogging(String billingNumber) {
        if (billingNumber == null || billingNumber.isBlank()) {
            return "****";
        }
        
        // Normalisiere zuerst (entferne Leerzeichen/Sonderzeichen für einheitliche Maskierung)
        String cleaned = billingNumber.replaceAll("[^0-9]", "");
        
        if (cleaned.length() <= 4) {
            return "****";
        }
        
        // Zeige nur letzten 4 Ziffern
        String last4 = cleaned.substring(cleaned.length() - 4);
        return "**********" + last4;
    }
}
