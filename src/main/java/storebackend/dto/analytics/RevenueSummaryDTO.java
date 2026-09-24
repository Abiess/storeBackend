package storebackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Analytics: Revenue Summary DTO
 * 
 * Liefert aggregierte Umsatzkennzahlen für einen Store
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevenueSummaryDTO {
    
    /**
     * Gesamtumsatz (nur bezahlte Bestellungen)
     * Berechnung: SUM(totalGross) WHERE paymentStatus=PAID AND status NOT IN (CANCELLED, FAILED)
     */
    private BigDecimal totalRevenue;
    
    /**
     * Anzahl bezahlter Bestellungen
     * Berechnung: COUNT WHERE paymentStatus=PAID
     */
    private Long paidOrderCount;
    
    /**
     * Durchschnittlicher Bestellwert
     * Berechnung: totalRevenue / paidOrderCount (0 wenn keine Orders)
     */
    private BigDecimal averageOrderValue;
    
    /**
     * Währungscode des Stores (z.B. "EUR", "MAD", "USD")
     */
    private String currencyCode;
}
