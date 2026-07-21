/**
 * Order Statistics DTO
 * 
 * Matches backend: storebackend.dto.analytics.OrderStatsDTO
 */
export interface OrderStats {
  /**
   * Bestellungen nach Status
   * Key: OrderStatus (PENDING, CONFIRMED, PROCESSING, etc.)
   * Value: Anzahl Bestellungen
   */
  ordersByStatus: Record<string, number>;
  
  /**
   * Bestellungen nach Zahlungsart
   * Key: PaymentMethod (PAYPAL, CASH_ON_DELIVERY, etc.)
   * Value: Anzahl Bestellungen
   */
  ordersByPaymentMethod: Record<string, number>;
}
