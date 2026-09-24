/**
 * Pipe Helper Utilities
 * Verhindert NG02100 Fehler durch sichere Wert-Validierung
 */

/**
 * Sicherer Date-Wert für DatePipe
 * @param value - Beliebiger Wert
 * @returns Gültiges Date oder null
 */
export function safeDateValue(value: any): Date | string | number | null {
  if (!value) return null;

  // Gültige Date-Typen
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && !isNaN(value)) return value;

  return null;
}

/**
 * Sicherer Number-Wert für CurrencyPipe/DecimalPipe
 * @param value - Beliebiger Wert
 * @param fallback - Fallback-Wert (default: 0)
 * @returns Gültige Zahl
 */
export function safeNumberValue(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;

  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Sicherer String-Wert für Pipes
 * @param value - Beliebiger Wert
 * @param fallback - Fallback-Wert (default: '')
 * @returns Gültiger String
 */
export function safeStringValue(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Prüft ob ein Wert eine gültige Date ist
 */
export function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Prüft ob ein Wert eine gültige Zahl ist
 */
export function isValidNumber(value: any): boolean {
  return value !== null && value !== undefined && !isNaN(Number(value));
}

/**
 * Formatiert einen Preis sicher
 * @param price - Preis-Wert
 * @param currency - Währung (default: 'EUR')
 * @param locale - Locale (default: 'de-DE')
 */
export function formatPrice(price: any, currency: string = 'EUR', locale: string = 'de-DE'): string {
  const safePrice = safeNumberValue(price, 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(safePrice);
  } catch (error) {
    console.error('Formatierungsfehler:', error);
    return `${safePrice.toFixed(2)} ${currency}`;
  }
}

/**
 * Formatiert ein Datum sicher
 * @param date - Datums-Wert
 * @param format - Format-String (default: 'dd.MM.yyyy')
 * @param locale - Locale (default: 'de-DE')
 */
export function formatDate(date: any, options?: Intl.DateTimeFormatOptions, locale: string = 'de-DE'): string {
  const safeDate = safeDateValue(date);
  if (!safeDate) return 'N/A';

  try {
    const dateObj = new Date(safeDate);
    return new Intl.DateTimeFormat(locale, options || {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
  } catch (error) {
    console.error('Datumsformatierungsfehler:', error);
    return 'Ungültiges Datum';
  }
}

