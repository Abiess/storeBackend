package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PriceMode;

import java.math.BigDecimal;

/**
 * Cart-Totals mit vollständiger Steuerberechnung.
 * 
 * Wird von Cart-Preview-Endpoint zurückgegeben, damit Frontend
 * korrekte Steuern anzeigen kann, bevor der Checkout erfolgt.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartTotalsResponseDTO {
    private BigDecimal subtotalNet;
    private BigDecimal subtotalTax;
    private BigDecimal subtotalGross;
    private BigDecimal deliveryFeeNet;
    private BigDecimal deliveryFeeTax;
    private BigDecimal deliveryFeeGross;
    private BigDecimal discountNet;
    private BigDecimal discountTax;
    private BigDecimal discountGross;
    private BigDecimal totalNet;
    private BigDecimal totalTax;
    private BigDecimal totalGross;
    private PriceMode priceMode;
    private boolean vatEnabled;
    
    /**
     * Durchschnittlicher Steuersatz über alle Positionen (für Anzeige).
     * Wird NUR für Anzeigezwecke berechnet, nicht für finale Berechnung verwendet.
     */
    private BigDecimal averageTaxRate;
}
