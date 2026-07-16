package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.enums.TaxCategory;
import storebackend.enums.PriceMode;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Zentrale Steuerberechnungslogik
 * 
 * WICHTIG: Alle Geldbeträge mit BigDecimal und RoundingMode.HALF_UP!
 * Keine double/float verwenden!
 */
@Service
public class TaxCalculationService {

    private static final int SCALE = 10; // Precision für Zwischenrechnungen
    private static final int MONEY_SCALE = 2; // Finale Geldbeträge
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    /**
     * Steuersatz aus TaxCategory ableiten
     * 
     * @param category Steuerkategorie
     * @return Steuersatz in Prozent (19.00, 7.00, 0.00)
     */
    public BigDecimal resolveTaxRate(TaxCategory category) {
        return switch (category) {
            case STANDARD -> new BigDecimal("19.00");
            case REDUCED -> new BigDecimal("7.00");
            case ZERO, EXEMPT -> BigDecimal.ZERO;
        };
    }

    /**
     * Berechne Nettobetrag aus Bruttobetrag
     * 
     * Formel: netto = brutto / (1 + taxRate/100)
     * 
     * Beispiel 19%:
     * - Brutto: 119,00 €
     * - Netto: 100,00 €
     * - Steuer: 19,00 €
     * 
     * @param gross Bruttobetrag
     * @param taxRate Steuersatz in Prozent (z.B. 19.00)
     * @return Nettobetrag
     */
    public BigDecimal calculateNetFromGross(BigDecimal gross, BigDecimal taxRate) {
        if (gross == null) return BigDecimal.ZERO;
        if (taxRate == null || taxRate.compareTo(BigDecimal.ZERO) == 0) {
            return gross.setScale(MONEY_SCALE, ROUNDING);
        }

        // divisor = 1 + (taxRate / 100)
        BigDecimal divisor = BigDecimal.ONE.add(
            taxRate.divide(new BigDecimal("100"), SCALE, ROUNDING)
        );

        return gross.divide(divisor, SCALE, ROUNDING)
                   .setScale(MONEY_SCALE, ROUNDING);
    }

    /**
     * Berechne Bruttobetrag aus Nettobetrag
     * 
     * Formel: brutto = netto * (1 + taxRate/100)
     * 
     * Beispiel 19%:
     * - Netto: 100,00 €
     * - Brutto: 119,00 €
     * - Steuer: 19,00 €
     * 
     * @param net Nettobetrag
     * @param taxRate Steuersatz in Prozent (z.B. 19.00)
     * @return Bruttobetrag
     */
    public BigDecimal calculateGrossFromNet(BigDecimal net, BigDecimal taxRate) {
        if (net == null) return BigDecimal.ZERO;
        if (taxRate == null || taxRate.compareTo(BigDecimal.ZERO) == 0) {
            return net.setScale(MONEY_SCALE, ROUNDING);
        }

        // multiplier = 1 + (taxRate / 100)
        BigDecimal multiplier = BigDecimal.ONE.add(
            taxRate.divide(new BigDecimal("100"), SCALE, ROUNDING)
        );

        return net.multiply(multiplier)
                 .setScale(MONEY_SCALE, ROUNDING);
    }

    /**
     * Berechne Steuerbetrag aus Netto- und Bruttobetrag
     * 
     * @param net Nettobetrag
     * @param gross Bruttobetrag
     * @return Steuerbetrag
     */
    public BigDecimal calculateTax(BigDecimal net, BigDecimal gross) {
        if (net == null || gross == null) return BigDecimal.ZERO;
        
        return gross.subtract(net)
                   .setScale(MONEY_SCALE, ROUNDING);
    }

    /**
     * Berechne Tax direkt aus taxRate und Netto
     * 
     * @param net Nettobetrag
     * @param taxRate Steuersatz in Prozent
     * @return Steuerbetrag
     */
    public BigDecimal calculateTaxFromNet(BigDecimal net, BigDecimal taxRate) {
        if (net == null || taxRate == null) return BigDecimal.ZERO;
        
        return net.multiply(taxRate)
                 .divide(new BigDecimal("100"), SCALE, ROUNDING)
                 .setScale(MONEY_SCALE, ROUNDING);
    }

    /**
     * Intelligente Preis-Aufteilung basierend auf PriceMode
     * 
     * @param price Eingegebener Preis (brutto bei GROSS, netto bei NET)
     * @param taxRate Steuersatz in Prozent
     * @param priceMode GROSS oder NET
     * @return TaxBreakdown mit net, tax, gross
     */
    public TaxBreakdown calculatePriceBreakdown(
        BigDecimal price,
        BigDecimal taxRate,
        PriceMode priceMode
    ) {
        if (price == null) {
            return new TaxBreakdown(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal net, gross, tax;

        if (priceMode == PriceMode.GROSS) {
            // Preis enthält bereits Steuer
            gross = price.setScale(MONEY_SCALE, ROUNDING);
            net = calculateNetFromGross(gross, taxRate);
            tax = calculateTax(net, gross);
        } else {
            // Preis ist netto, Steuer kommt hinzu
            net = price.setScale(MONEY_SCALE, ROUNDING);
            gross = calculateGrossFromNet(net, taxRate);
            tax = calculateTax(net, gross);
        }

        return new TaxBreakdown(net, tax, gross);
    }

    /**
     * Ergebnis einer Steuerberechnung
     */
    public record TaxBreakdown(
        BigDecimal net,
        BigDecimal tax,
        BigDecimal gross
    ) {}
}
