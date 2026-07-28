package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Ergebnis der Staffelpreis-Berechnung mit allen Metadaten.
 * 
 * Wird zentral von ProductTierPriceService.calculateWithDetails() zurückgegeben
 * und in CartItemDTO, OrderItem-Erstellung und Frontend-DTOs wiederverwendet.
 * 
 * Beispiel:
 * - Produkt: 3,99 € Standardpreis
 * - Menge: 25
 * - Aktive Stufen: ab 12 → 3,49 €, ab 24 → 2,99 €
 * 
 * Ergebnis:
 * - baseUnitPrice: 3.99
 * - effectiveUnitPrice: 2.99 (Stufe ab 24 angewendet)
 * - tierPriceApplied: true
 * - appliedTierMinimumQuantity: 24
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TierPriceCalculationResult {
    
    /**
     * Basispreis des Produkts (product.basePrice oder variant.price).
     */
    private BigDecimal baseUnitPrice;
    
    /**
     * Wirksamer Stückpreis nach Anwendung von Staffelpreisen.
     * Entspricht baseUnitPrice wenn keine Stufe erreicht wurde.
     */
    private BigDecimal effectiveUnitPrice;
    
    /**
     * Ob eine Staffelpreis-Stufe angewendet wurde.
     * false = keine Stufe erreicht, basePrice gilt
     * true = Staffelpreis wurde angewendet
     */
    private Boolean tierPriceApplied;
    
    /**
     * Mindestmenge der angewendeten Preisstufe.
     * null wenn keine Stufe angewendet wurde.
     */
    private Integer appliedTierMinimumQuantity;
    
    /**
     * Convenience-Constructor für Fälle ohne Staffelpreis.
     */
    public static TierPriceCalculationResult withoutTierPrice(BigDecimal basePrice) {
        return new TierPriceCalculationResult(
            basePrice,
            basePrice,
            false,
            null
        );
    }
    
    /**
     * Convenience-Constructor für Fälle mit Staffelpreis.
     */
    public static TierPriceCalculationResult withTierPrice(
            BigDecimal basePrice,
            BigDecimal tierPrice,
            Integer tierMinimumQuantity) {
        return new TierPriceCalculationResult(
            basePrice,
            tierPrice,
            true,
            tierMinimumQuantity
        );
    }
}
