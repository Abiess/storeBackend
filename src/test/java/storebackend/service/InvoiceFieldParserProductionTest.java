package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.dto.ParsedInvoiceFields;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Production-Test mit echtem OCR-Text von documentId=3
 */
class InvoiceFieldParserProductionTest {

    private final InvoiceFieldParser parser = new InvoiceFieldParser();

    @Test
    void testProductionInvoice_DocumentId3() {
        // Echter OCR-Text aus Production (gekürzt auf relevante Teile)
        String rawText = """
            MARZOUK HANDELS GMBH
            Industriestr. 42
            12345 Musterstadt
            
            Rechnung Nr. 2026/00442
            Kundennr: 60534
            Datum: 08/05/2026
            Lieferdatum: 05/05/2026
            
            Position  Menge  Einheit  Bezeichnung  Einzelpreis  Gesamtpreis
            1         10     Stk      Produkt A    154.34       1543.40
            
            NETTOBETRAG: 1.543,40
            MwSt. BETRAG: 150,41
            Saldo zu bezahlen: 1693.81 EUR
            ENDBETRAG: 1.693,81 EUR
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Debug-Ausgabe
        System.out.println("=== PARSER RESULTS ===");
        System.out.println("supplierName: " + result.supplierName());
        System.out.println("invoiceNumber: " + result.invoiceNumber());
        System.out.println("invoiceDate: " + result.invoiceDate());
        System.out.println("deliveryDate: " + result.deliveryDate());
        System.out.println("netAmount: " + result.netAmount());
        System.out.println("taxAmount: " + result.taxAmount());
        System.out.println("grossAmount: " + result.grossAmount());
        System.out.println("currency: " + result.currency());
        System.out.println("confidence: " + result.confidence());
        System.out.println("warnings: " + result.warnings());

        // Assertions
        assertNotNull(result.supplierName(), "Lieferant muss erkannt werden");
        assertTrue(result.supplierName().contains("MARZOUK"), 
            "Lieferant sollte 'MARZOUK' enthalten, ist aber: " + result.supplierName());

        assertNotNull(result.invoiceNumber(), "Rechnungsnummer muss erkannt werden");
        assertEquals("2026/00442", result.invoiceNumber());

        assertNotNull(result.netAmount(), "Nettobetrag muss erkannt werden");
        assertEquals(new BigDecimal("1543.40"), result.netAmount());

        assertNotNull(result.taxAmount(), "MwSt. muss erkannt werden");
        assertEquals(new BigDecimal("150.41"), result.taxAmount());

        assertNotNull(result.grossAmount(), "Gesamtbetrag muss erkannt werden");
        assertEquals(new BigDecimal("1693.81"), result.grossAmount());

        assertEquals("EUR", result.currency());
    }
    
    @Test
    void testProductionPatterns_Isolated() {
        // Teste einzelne Pattern-Matches
        InvoiceFieldParser parser = new InvoiceFieldParser();
        
        // NETTOBETRAG Pattern
        String netText = "NETTOBETRAG: 1.543,40";
        ParsedInvoiceFields netResult = parser.parse(netText + "\nEUR");
        System.out.println("Net amount from '" + netText + "': " + netResult.netAmount());
        
        // MwSt. BETRAG Pattern  
        String taxText = "MwSt. BETRAG: 150,41";
        ParsedInvoiceFields taxResult = parser.parse(taxText + "\nEUR");
        System.out.println("Tax amount from '" + taxText + "': " + taxResult.taxAmount());
        
        // ENDBETRAG Pattern
        String grossText = "ENDBETRAG: 1.693,81 EUR";
        ParsedInvoiceFields grossResult = parser.parse(grossText);
        System.out.println("Gross amount from '" + grossText + "': " + grossResult.grossAmount());
        
        // Assertions
        assertNotNull(netResult.netAmount(), "NETTOBETRAG Pattern muss matchen");
        assertNotNull(taxResult.taxAmount(), "MwSt. BETRAG Pattern muss matchen");
        assertNotNull(grossResult.grossAmount(), "ENDBETRAG Pattern muss matchen");
    }
}
