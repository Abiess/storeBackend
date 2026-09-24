package storebackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Analytics: Top Product DTO
 * 
 * Ein Produkt mit verkaufter Menge und Umsatz
 * 
 * WICHTIG: Konstruktor-Typen müssen exakt zu JPQL-Aggregationen passen:
 * - SUM(oi.quantity) → Long (quantity ist Integer, aber SUM gibt Long zurück)
 * - SUM(oi.total) → BigDecimal
 * - COUNT(DISTINCT o.id) → Long
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
     * Produktname (title aus Product-Entity)
     */
    private String productName;
    
    /**
     * Gesamt verkaufte Menge
     * Berechnung: SUM(order_items.quantity)
     * Typ: Long (SUM gibt immer Long zurück, auch wenn quantity Integer ist)
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
