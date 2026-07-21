/**
 * Revenue Summary DTO
 * 
 * Matches backend: storebackend.dto.analytics.RevenueSummaryDTO
 */
export interface RevenueSummary {
  /**
   * Gesamtumsatz (nur bezahlte Bestellungen)
   */
  totalRevenue: number;
  
  /**
   * Anzahl bezahlter Bestellungen
   */
  paidOrderCount: number;
  
  /**
   * Durchschnittlicher Bestellwert
   */
  averageOrderValue: number;
  
  /**
   * Währungscode (z.B. "EUR", "MAD", "USD")
   */
  currencyCode: string;
}
