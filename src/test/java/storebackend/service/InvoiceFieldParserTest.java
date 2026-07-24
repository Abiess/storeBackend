package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import storebackend.dto.ParsedInvoiceFields;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class InvoiceFieldParserTest {

    private InvoiceFieldParser parser;

    @BeforeEach
    void setUp() {
        parser = new InvoiceFieldParser();
    }

    @Test
    void testGermanInvoice_AllFieldsPresent() {
        String rawText = """
            Marzouk Handels GmbH
            Musterstraße 123
            12345 Berlin
            
            Rechnung Nr.: 2026/00442
            Rechnungsdatum: 08.05.2026
            Lieferdatum: 05.05.2026
            
            Nettobetrag: 1.543,40 €
            MwSt. (19%): 150,41 €
            Gesamtbetrag: 1.693,81 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertEquals("Marzouk Handels GmbH", result.supplierName());
        assertEquals("2026/00442", result.invoiceNumber());
        assertEquals(LocalDate.of(2026, 5, 8), result.invoiceDate());
        assertEquals(LocalDate.of(2026, 5, 5), result.deliveryDate());
        assertEquals(new BigDecimal("1543.40"), result.netAmount());
        assertEquals(new BigDecimal("150.41"), result.taxAmount());
        assertEquals(new BigDecimal("1693.81"), result.grossAmount());
        assertEquals("EUR", result.currency());
        
        assertTrue(result.warnings().isEmpty(), "No warnings expected for valid data");
    }

    @Test
    void testEnglishInvoice_WithEnglishNumberFormat_ddMMFormat() {
        String rawText = """
            ACME Corporation Ltd.
            123 Main Street
            London
            
            Invoice Number: INV-2026-1234
            Invoice Date: 08/05/2026
            Delivery Date: 05/05/2026
            
            Net: 1,543.40 £
            VAT (20%): 308.68 £
            Total: 1,852.08 £
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertEquals("ACME Corporation Ltd.", result.supplierName());
        assertEquals("INV-2026-1234", result.invoiceNumber());
        assertEquals(LocalDate.of(2026, 5, 8), result.invoiceDate());
        assertEquals(LocalDate.of(2026, 5, 5), result.deliveryDate());
        assertEquals(new BigDecimal("1543.40"), result.netAmount());
        assertEquals(new BigDecimal("308.68"), result.taxAmount());
        assertEquals(new BigDecimal("1852.08"), result.grossAmount());
        assertEquals("GBP", result.currency());
    }

    @Test
    void testFrenchInvoice() {
        String rawText = """
            Société Exemple SARL
            12 Rue de Paris
            75001 Paris
            
            Facture N° 2026-FR-001
            Date de facture: 08/05/2026
            Date de livraison: 05/05/2026
            
            Sous-total: 1.543,40 €
            TVA (20%): 308,68 €
            Total TTC: 1.852,08 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertEquals("Société Exemple SARL", result.supplierName());
        assertEquals("2026-FR-001", result.invoiceNumber());
        assertEquals(LocalDate.of(2026, 5, 8), result.invoiceDate());
        assertEquals(LocalDate.of(2026, 5, 5), result.deliveryDate());
        assertEquals(new BigDecimal("1543.40"), result.netAmount());
        assertEquals(new BigDecimal("308.68"), result.taxAmount());
        // "Total TTC" wird als "Total" erkannt
        assertEquals(new BigDecimal("1852.08"), result.grossAmount());
        assertEquals("EUR", result.currency());
    }

    @Test
    void testOcrErrors_ConfusingCharacters() {
        // OCR häufig verwechselt: O/0, I/1, S/5
        String rawText = """
            Musterfirma GmbH
            
            Rechnungsnummer: 2O26/OO442
            Rechnungsdatum: O8.O5.2O26
            
            Nettobetrag: 1.543,4O €
            Gesamtbetrag: 1.693,8I €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Parser sollte O/0 nicht verwechseln - String wird so übernommen
        assertEquals("2O26/OO442", result.invoiceNumber());
        
        // Datum-Parser scheitert bei O statt 0
        assertNull(result.invoiceDate(), "Date with 'O' instead of '0' should fail");
        
        // Beträge sollten trotzdem erkannt werden
        assertNotNull(result.netAmount());
        assertNotNull(result.grossAmount());
    }

    @Test
    void testMultipleAmounts_FirstOneWins() {
        String rawText = """
            Test Firma GmbH
            
            Rechnungsnummer: 2026/001
            
            Zwischensumme: 100,00 €
            Nettobetrag: 500,00 €
            Gesamtbetrag: 200,00 €
            Endbetrag Total: 595,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Erster "Gesamt"-Treffer gewinnt (nicht letzter)
        assertEquals(new BigDecimal("200.00"), result.grossAmount());
        assertEquals(new BigDecimal("500.00"), result.netAmount());
    }

    @Test
    void testMissingGrossAmount() {
        String rawText = """
            Test Firma GmbH
            
            Rechnung Nr.: 2026/999
            Rechnungsdatum: 10.06.2026
            
            Nettobetrag: 1000,00 €
            MwSt.: 190,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertEquals("2026/999", result.invoiceNumber());
        assertEquals(new BigDecimal("1000.00"), result.netAmount());
        assertEquals(new BigDecimal("190.00"), result.taxAmount());
        assertNull(result.grossAmount());
        
        assertTrue(result.warnings().contains("Gesamtbetrag nicht erkannt"));
    }

    @Test
    void testImplausibleSum_GrossLessThanNet() {
        String rawText = """
            Test Firma GmbH
            
            Rechnung Nr.: 2026/BAD
            
            Nettobetrag: 1000,00 €
            MwSt.: 190,00 €
            Gesamtbetrag: 500,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertTrue(result.warnings().stream()
            .anyMatch(w -> w.contains("Gesamtbetrag ist kleiner als Nettobetrag")),
            "Should warn about gross < net");
    }

    @Test
    void testImplausibleSum_MathDoesNotMatch() {
        String rawText = """
            Test Firma GmbH
            
            Rechnung Nr.: 2026/MATH
            
            Nettobetrag: 1000,00 €
            MwSt.: 190,00 €
            Gesamtbetrag: 1500,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertTrue(result.warnings().stream()
            .anyMatch(w -> w.contains("Netto + MwSt. ≠ Gesamt")),
            "Should warn about calculation mismatch");
    }

    @Test
    void testValidSum_WithinTolerance() {
        String rawText = """
            Test Firma GmbH
            
            Nettobetrag: 100,00 €
            MwSt.: 19,00 €
            Gesamtbetrag: 119,01 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // 100 + 19 = 119, aber Gesamtbetrag ist 119.01 (Differenz 0.01 € < Toleranz 0.02 €)
        assertFalse(result.warnings().stream()
            .anyMatch(w -> w.contains("Netto + MwSt. ≠ Gesamt")),
            "Should NOT warn - within 0.02 EUR tolerance");
    }

    @Test
    void testNoInvoiceNumber() {
        String rawText = """
            Test Firma GmbH
            
            Datum: 10.06.2026
            
            Gesamtbetrag: 500,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertNull(result.invoiceNumber());
        assertTrue(result.warnings().contains("Rechnungsnummer nicht erkannt"));
    }

    @Test
    void testHeuristicSupplierName_MayNotWarnIfShortOrInvalid() {
        String rawText = """
            Some Text
            
            Rechnung Nr.: 2026/001
            Gesamtbetrag: 100,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Supplier wird heuristisch gefunden
        assertNotNull(result.supplierName());
        // Ob Warning gesetzt wird, hängt von den genauen Bedingungen ab
        // Test prüft nur, dass Supplier gefunden wurde
    }

    @Test
    void testEmptyRawText() {
        ParsedInvoiceFields result = parser.parse("");

        assertNull(result.supplierName());
        assertNull(result.invoiceNumber());
        assertNull(result.grossAmount());
        assertTrue(result.warnings().contains("Raw text ist leer"));
    }

    @Test
    void testNullRawText() {
        ParsedInvoiceFields result = parser.parse(null);

        assertNull(result.supplierName());
        assertTrue(result.warnings().contains("Raw text ist leer"));
    }

    @Test
    void testCurrencyDetection_USD() {
        String rawText = """
            Test Company Inc.
            
            Invoice No: 2026-001
            
            Total: $1,500.00 USD
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertEquals("USD", result.currency());
    }

    @Test
    void testCurrencyDetection_Default() {
        String rawText = """
            Test Firma
            
            Rechnung: 001
            Gesamt: 100,00
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        assertEquals("EUR", result.currency()); // Default
    }

    @Test
    void testDateFormat_ISOPattern_NotSupportedWithoutLabel() {
        // ISO format ohne Label-Match wird NICHT erkannt (Pattern braucht Label)
        String rawText = """
            Test GmbH
            
            Rechnung Nr.: 2026/001
            2026-05-08
            
            Gesamt: 100,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Ohne "Rechnungsdatum:"-Label wird ISO-Datum nicht erkannt
        assertNull(result.invoiceDate(), "ISO date without label should NOT be parsed");
    }

    @Test
    void testConfidenceValues() {
        String rawText = """
            Musterfirma GmbH
            
            Rechnung Nr.: 2026/001
            Rechnungsdatum: 08.05.2026
            
            Nettobetrag: 100,00 €
            MwSt.: 19,00 €
            Gesamtbetrag: 119,00 €
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Company with GmbH = 0.9 confidence
        assertEquals(0.9, result.confidence().get("supplierName"));
        
        // Clear label matches = 1.0 confidence
        assertEquals(1.0, result.confidence().get("invoiceNumber"));
        assertEquals(1.0, result.confidence().get("invoiceDate"));
        assertEquals(1.0, result.confidence().get("netAmount"));
        assertEquals(1.0, result.confidence().get("taxAmount"));
        assertEquals(1.0, result.confidence().get("grossAmount"));
        assertEquals(1.0, result.confidence().get("currency"));
    }

    @Test
    void testNoFieldsRecognized_HeuristicSupplierStillWorks() {
        String rawText = """
            Just some random text
            with no invoice data
            at all
            """;

        ParsedInvoiceFields result = parser.parse(rawText);

        // Heuristic finds first line as supplier
        assertEquals(0.5, result.confidence().get("supplierName")); // Heuristic = 0.5
        assertEquals(0.0, result.confidence().get("invoiceNumber"));
        assertEquals(0.0, result.confidence().get("invoiceDate"));
        assertEquals(0.0, result.confidence().get("grossAmount"));
    }
}
