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
        // Echter OCR-Text aus Production mit allen problematischen Zeilen
        String rawText = """
            MARZOUK HANDELS GMBH
            Industriestr. 42
            12345 Musterstadt
            
            2026/00442 60534 08/05/2026
            Lieferschein Nr. 2026/00399
            
            Rechnung Nr. 2026/00442
            Kundennr: 60534
            Datum: 08/05/2026
            Lieferdatum: 05/05/2026
            
            Position  Menge  MwSt.Betrag 34 Art.  Bezeichnung  Einzelpreis  Gesamtpreis
            1         10     Stk                   Produkt A    154.34       1543.40
            
            NETTOBETRAG: 1.543,40
            MwSt. BETRAG: 150,41
            Saldo zu bezahlen: 1693.81 EUR
            ENDBETRAG: 1.693,81 EUR
            
            R wm oe GmbH
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

        // Assertions für alle 8 Felder
        assertEquals("MARZOUK HANDELS GMBH", result.supplierName(), 
            "Lieferant muss 'MARZOUK HANDELS GMBH' sein (nicht 'R wm oe GmbH')");
        
        assertEquals("2026/00442", result.invoiceNumber(), 
            "Rechnungsnummer muss '2026/00442' sein (nicht Lieferschein '2026/00399')");
        
        assertEquals(java.time.LocalDate.of(2026, 5, 8), result.invoiceDate(), 
            "Rechnungsdatum muss 08.05.2026 sein (nicht Lieferdatum)");
        
        assertEquals(java.time.LocalDate.of(2026, 5, 5), result.deliveryDate(), 
            "Lieferdatum muss 05.05.2026 sein");
        
        assertEquals(new BigDecimal("1543.40"), result.netAmount(), 
            "Nettobetrag muss 1543.40 sein");
        
        assertEquals(new BigDecimal("150.41"), result.taxAmount(), 
            "MwSt. muss 150.41 sein (nicht 34 aus Tabellenüberschrift)");
        
        assertEquals(new BigDecimal("1693.81"), result.grossAmount(), 
            "Gesamtbetrag muss 1693.81 sein");
        
        assertEquals("EUR", result.currency(), "Währung muss EUR sein");
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
