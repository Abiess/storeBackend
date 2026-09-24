/**
 * Typed representation of backend date/time values.
 * Supports multiple formats:
 * - ISO String: "2026-07-24T09:09:33.243031000"
 * - Date object: new Date()
 * - Unix timestamp: 1721811573000
 * - Spring LocalDateTime array: [year, month (1-12), day, hour?, minute?, second?, nano?]
 * - null/undefined
 */
export type BackendDateTime =
  | string
  | Date
  | number
  | [number, number, number, number?, number?, number?, number?]
  | null
  | undefined;

/**
 * Supported languages in the application
 */
export type SupportedLanguage = 'de' | 'en' | 'ar' | 'fr';

/**
 * Central locale mapping for date/number formatting
 * Maps application language codes to Intl/Angular locale identifiers
 * 
 * Note: ar-MA uses Gregorian calendar by default (matching app.config.ts registration)
 */
const LOCALE_MAP: Record<SupportedLanguage, string> = {
  de: 'de-DE',
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar-MA'  // Marokkanisches Arabisch mit gregorianischem Kalender
};

/**
 * Get the Intl locale identifier for a given language code
 * @param lang - Language code (de, en, fr, ar)
 * @returns Locale identifier (e.g., 'de-DE', 'en-US')
 */
export function getLocaleForLanguage(lang: string): string {
  return LOCALE_MAP[lang as SupportedLanguage] ?? 'de-DE';
}

/**
 * Konvertiert LocalDateTime-Array von Spring Boot zu JS Date
 * Format: [year, month, day, hour, minute, second, nano]
 * Beispiel: [2026,3,3,15,24,9,692042000] → Date
 */
export function toDate(value: BackendDateTime): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  // ISO String or timestamp
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  // Spring LocalDateTime array
  if (Array.isArray(value) && value.length >= 3) {
    // Spring LocalDateTime: [year, month (1-12), day, hour, minute, second, nano]
    // JS Date erwartet month 0-11, daher -1
    return new Date(
      value[0],           // year
      value[1] - 1,       // month (0-11)
      value[2],           // day
      value[3] || 0,      // hour
      value[4] || 0,      // minute
      value[5] || 0,      // second
      Math.floor((value[6] || 0) / 1000000) // nano → milliseconds
    );
  }
  
  return null;
}

