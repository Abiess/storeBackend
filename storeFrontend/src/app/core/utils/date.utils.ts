/**
 * Konvertiert LocalDateTime-Array von Spring Boot zu JS Date
 * Format: [year, month, day, hour, minute, second, nano]
 * Beispiel: [2026,3,3,15,24,9,692042000] → Date
 */
export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
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

