/**
 * Top Product DTO
 * 
 * Matches backend: storebackend.dto.analytics.TopProductDTO
 */
export interface TopProduct {
  /**
   * Produkt-ID
   */
  productId: number;
  
  /**
   * Produktname
   */
  productName: string;
  
  /**
   * Gesamt verkaufte Menge
   */
  totalQuantitySold: number;
  
  /**
   * Gesamt Umsatz für dieses Produkt
   */
  totalRevenue: number;
  
  /**
   * Anzahl Bestellungen mit diesem Produkt
   */
  orderCount: number;
}
