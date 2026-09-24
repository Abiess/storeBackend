package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.enums.PriceMode;
import storebackend.enums.TaxCategory;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests für TaxCalculationService
 * Validiert korrekte Steuerberechnungen gemäß deutscher Umsatzsteuer
 */
class TaxCalculationServiceTest {

    private final TaxCalculationService service = new TaxCalculationService();

    @Test
    void testResolveTaxRate_Standard() {
        BigDecimal rate = service.resolveTaxRate(TaxCategory.STANDARD);
        assertEquals(new BigDecimal("19.00"), rate);
    }

    @Test
    void testResolveTaxRate_Reduced() {
        BigDecimal rate = service.resolveTaxRate(TaxCategory.REDUCED);
        assertEquals(new BigDecimal("7.00"), rate);
    }

    @Test
    void testResolveTaxRate_Zero() {
        BigDecimal rate = service.resolveTaxRate(TaxCategory.ZERO);
        assertEquals(BigDecimal.ZERO, rate);
    }

    @Test
    void testResolveTaxRate_Exempt() {
        BigDecimal rate = service.resolveTaxRate(TaxCategory.EXEMPT);
        assertEquals(BigDecimal.ZERO, rate);
    }

    /**
     * Test: 119,00 EUR brutto bei 19% → 100,00 EUR netto, 19,00 EUR Steuer
     */
    @Test
    void testCalculateNetFromGross_19Percent() {
        BigDecimal gross = new BigDecimal("119.00");
        BigDecimal taxRate = new BigDecimal("19.00");
        
        BigDecimal net = service.calculateNetFromGross(gross, taxRate);
        
        assertEquals(new BigDecimal("100.00"), net);
    }

    /**
     * Test: 107,00 EUR brutto bei 7% → 100,00 EUR netto, 7,00 EUR Steuer
     */
    @Test
    void testCalculateNetFromGross_7Percent() {
        BigDecimal gross = new BigDecimal("107.00");
        BigDecimal taxRate = new BigDecimal("7.00");
        
        BigDecimal net = service.calculateNetFromGross(gross, taxRate);
        
        assertEquals(new BigDecimal("100.00"), net);
    }

    /**
     * Test: 100,00 EUR netto bei 19% → 119,00 EUR brutto
     */
    @Test
    void testCalculateGrossFromNet_19Percent() {
        BigDecimal net = new BigDecimal("100.00");
        BigDecimal taxRate = new BigDecimal("19.00");
        
        BigDecimal gross = service.calculateGrossFromNet(net, taxRate);
        
        assertEquals(new BigDecimal("119.00"), gross);
    }

    /**
     * Test: 100,00 EUR netto bei 7% → 107,00 EUR brutto
     */
    @Test
    void testCalculateGrossFromNet_7Percent() {
        BigDecimal net = new BigDecimal("100.00");
        BigDecimal taxRate = new BigDecimal("7.00");
        
        BigDecimal gross = service.calculateGrossFromNet(net, taxRate);
        
        assertEquals(new BigDecimal("107.00"), gross);
    }

    /**
     * Test: PriceBreakdown GROSS mode bei 19%
     */
    @Test
    void testPriceBreakdown_Gross_19Percent() {
        BigDecimal price = new BigDecimal("119.00");
        BigDecimal taxRate = new BigDecimal("19.00");
        
        TaxCalculationService.TaxBreakdown breakdown = 
            service.calculatePriceBreakdown(price, taxRate, PriceMode.GROSS);
        
        assertEquals(new BigDecimal("100.00"), breakdown.net());
        assertEquals(new BigDecimal("19.00"), breakdown.tax());
        assertEquals(new BigDecimal("119.00"), breakdown.gross());
    }

    /**
     * Test: PriceBreakdown GROSS mode bei 7%
     */
    @Test
    void testPriceBreakdown_Gross_7Percent() {
        BigDecimal price = new BigDecimal("107.00");
        BigDecimal taxRate = new BigDecimal("7.00");
        
        TaxCalculationService.TaxBreakdown breakdown = 
            service.calculatePriceBreakdown(price, taxRate, PriceMode.GROSS);
        
        assertEquals(new BigDecimal("100.00"), breakdown.net());
        assertEquals(new BigDecimal("7.00"), breakdown.tax());
        assertEquals(new BigDecimal("107.00"), breakdown.gross());
    }

    /**
     * Test: PriceBreakdown NET mode bei 19%
     */
    @Test
    void testPriceBreakdown_Net_19Percent() {
        BigDecimal price = new BigDecimal("100.00");
        BigDecimal taxRate = new BigDecimal("19.00");
        
        TaxCalculationService.TaxBreakdown breakdown = 
            service.calculatePriceBreakdown(price, taxRate, PriceMode.NET);
        
        assertEquals(new BigDecimal("100.00"), breakdown.net());
        assertEquals(new BigDecimal("19.00"), breakdown.tax());
        assertEquals(new BigDecimal("119.00"), breakdown.gross());
    }

    /**
     * Test: Rundung bei 9,99 EUR brutto bei 19%
     */
    @Test
    void testRounding_9_99_Brutto() {
        BigDecimal gross = new BigDecimal("9.99");
        BigDecimal taxRate = new BigDecimal("19.00");
        
        BigDecimal net = service.calculateNetFromGross(gross, taxRate);
        BigDecimal tax = service.calculateTax(net, gross);
        
        // 9,99 / 1,19 = 8,3949... → 8,39 (gerundet)
        // Steuer = 9,99 - 8,39 = 1,60
        assertEquals(new BigDecimal("8.39"), net);
        assertEquals(new BigDecimal("1.60"), tax);
    }

    /**
     * Test: Gemischte Bestellung (119 + 107 = 226 brutto)
     */
    @Test
    void testMixedOrder() {
        // Position 1: 119 EUR bei 19%
        TaxCalculationService.TaxBreakdown item1 = 
            service.calculatePriceBreakdown(
                new BigDecimal("119.00"),
                new BigDecimal("19.00"),
                PriceMode.GROSS
            );
        
        // Position 2: 107 EUR bei 7%
        TaxCalculationService.TaxBreakdown item2 = 
            service.calculatePriceBreakdown(
                new BigDecimal("107.00"),
                new BigDecimal("7.00"),
                PriceMode.GROSS
            );
        
        // Gesamt
        BigDecimal totalNet = item1.net().add(item2.net());
        BigDecimal totalTax = item1.tax().add(item2.tax());
        BigDecimal totalGross = item1.gross().add(item2.gross());
        
        assertEquals(new BigDecimal("200.00"), totalNet);
        assertEquals(new BigDecimal("26.00"), totalTax);
        assertEquals(new BigDecimal("226.00"), totalGross);
    }

    /**
     * Test: Menge 2 × 119,00 bei 19%
     */
    @Test
    void testQuantity() {
        TaxCalculationService.TaxBreakdown unitBreakdown = 
            service.calculatePriceBreakdown(
                new BigDecimal("119.00"),
                new BigDecimal("19.00"),
                PriceMode.GROSS
            );
        
        // 2 Stück
        BigDecimal lineNet = unitBreakdown.net().multiply(new BigDecimal("2"));
        BigDecimal lineTax = unitBreakdown.tax().multiply(new BigDecimal("2"));
        BigDecimal lineGross = unitBreakdown.gross().multiply(new BigDecimal("2"));
        
        assertEquals(new BigDecimal("200.00"), lineNet);
        assertEquals(new BigDecimal("38.00"), lineTax);
        assertEquals(new BigDecimal("238.00"), lineGross);
    }

    /**
     * Test: Steuerbefreit (EXEMPT)
     */
    @Test
    void testTaxExempt() {
        TaxCalculationService.TaxBreakdown breakdown = 
            service.calculatePriceBreakdown(
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                PriceMode.GROSS
            );
        
        assertEquals(new BigDecimal("100.00"), breakdown.net());
        assertEquals(new BigDecimal("0.00"), breakdown.tax());
        assertEquals(new BigDecimal("100.00"), breakdown.gross());
    }
}
