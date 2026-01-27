package storebackend.config;

import org.springframework.context.annotation.Configuration;

import java.util.*;

@Configuration
public class LanguageConfig {

    public static final String DEFAULT_LANGUAGE = "en";
    public static final Set<String> SUPPORTED_LANGUAGES = Set.of("de", "en", "ar");
    public static final String COOKIE_NAME = "preferred_lang";
    public static final int COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 Jahr

    public static boolean isSupported(String lang) {
        return lang != null && SUPPORTED_LANGUAGES.contains(lang.toLowerCase());
    }

    public static String getDirection(String lang) {
        return "ar".equals(lang) ? "rtl" : "ltr";
    }

    /**
     * Parse Accept-Language Header mit q-values
     * Beispiel: "de-DE,de;q=0.9,en;q=0.8,ar;q=0.7"
     */
    public static String parseAcceptLanguage(String acceptLanguageHeader) {
        if (acceptLanguageHeader == null || acceptLanguageHeader.trim().isEmpty()) {
            return DEFAULT_LANGUAGE;
        }

        List<LanguageRange> ranges = new ArrayList<>();

        String[] languages = acceptLanguageHeader.split(",");
        for (String lang : languages) {
            lang = lang.trim();
            if (lang.isEmpty()) continue;

            double quality = 1.0;
            String code = lang;

            // Parse q-value
            if (lang.contains(";q=")) {
                String[] parts = lang.split(";q=");
                code = parts[0].trim();
                try {
                    quality = Double.parseDouble(parts[1].trim());
                } catch (NumberFormatException e) {
                    quality = 1.0;
                }
            }

            // Extrahiere Hauptsprache (de-DE -> de)
            if (code.contains("-")) {
                code = code.split("-")[0];
            }

            code = code.toLowerCase();

            if (isSupported(code)) {
                ranges.add(new LanguageRange(code, quality));
            }
        }

        // Sortiere nach Quality (höchste zuerst)
        ranges.sort((a, b) -> Double.compare(b.quality, a.quality));

        return ranges.isEmpty() ? DEFAULT_LANGUAGE : ranges.get(0).code;
    }

    private static class LanguageRange {
        String code;
        double quality;

        LanguageRange(String code, double quality) {
            this.code = code;
            this.quality = quality;
        }
    }
}

