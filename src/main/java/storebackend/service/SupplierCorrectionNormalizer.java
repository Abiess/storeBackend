package storebackend.service;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normalizes text for fuzzy matching of supplier field corrections.
 * 
 * Phase 3A: Simple normalization (lowercase, remove special chars, trim whitespace).
 * Future: More aggressive OCR error repair, phonetic matching, etc.
 */
@Component
public class SupplierCorrectionNormalizer {
    
    /**
     * Normalize a text value for matching.
     * 
     * Examples:
     * - "MARZOUK HANDELS GMBH" → "marzouk handels gmbh"
     * - "Marzouk   Handels  GmbH" → "marzouk handels gmbh"
     * - "R wm oe GmbH" → "r wm oe gmbh"
     * 
     * @param value Raw text value
     * @return Normalized value (empty string if null)
     */
    public String normalize(String value) {
        if (value == null) {
            return "";
        }
        
        // 1. Unicode normalization (NFKD = Compatibility Decomposition)
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKD);
        
        // 2. Remove diacritics (combining marks)
        normalized = normalized.replaceAll("\\p{M}", "");
        
        // 3. Lowercase
        normalized = normalized.toLowerCase(Locale.ROOT);
        
        // 4. Remove all non-alphanumeric characters, replace with single space
        normalized = normalized.replaceAll("[^a-z0-9]+", " ");
        
        // 5. Collapse multiple spaces to single space
        normalized = normalized.replaceAll("\\s+", " ");
        
        // 6. Trim
        normalized = normalized.trim();
        
        return normalized;
    }
}
