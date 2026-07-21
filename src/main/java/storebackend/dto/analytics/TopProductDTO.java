package storebackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Analytics: Top Product DTO
 * 
 * Ein Produkt mit verkaufter Menge und Umsatz
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TopProductDTO {
    
    /**
     * Produkt-ID
     */
    private Long productId;
    
    /**
     * Produktname (Snapshot aus OrderItem)
     */
    private String productName;
    
    /**
     * Gesamt verkaufte Menge
     * Berechnung: SUM(order_items.quantity)
     */
    private Long totalQuantitySold;
    
    /**
     * Gesamt Umsatz für dieses Produkt
     * Berechnung: SUM(order_items.total)
     */
    private BigDecimal totalRevenue;
    
    /**
     * Anzahl Bestellungen, die dieses Produkt enthalten
     * Berechnung: COUNT(DISTINCT order_id)
     */
    private Long orderCount;
}
