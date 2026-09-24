package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import storebackend.enums.InvoiceDocumentType;
import storebackend.enums.InvoiceParseStatus;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Standalone-Test für PDFBoxTextExtractor OHNE Spring-Context.
 * 
 * Testet mit einer echten PDF-Datei die Text-Extraktion.
 */
@Slf4j
public class PDFBoxTextExtractorStandaloneTest {
    
    @Test
    public void testTextPdfExtraction() throws IOException {
        // Test-PDF mit eingebettetem Text erstellen
        String pdfContent = "%PDF-1.4\n" +
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
            "2 0 obj << /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >> endobj\n" +
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj\n" +
            "4 0 obj << /Length 250 >> stream\n" +
            "BT\n" +
            "/F1 24 Tf\n" +
            "50 700 Td\n" +
            "(Rechnung Nr. 2026/00442) Tj\n" +
            "0 -30 Td\n" +
            "(Marzouk Handels GmbH) Tj\n" +
            "0 -30 Td\n" +
            "(Rechnungsdatum: 08.05.2026) Tj\n" +
            "0 -30 Td\n" +
            "(Lieferdatum: 05.05.2026) Tj\n" +
            "0 -30 Td\n" +
            "(Nettobetrag: 1.543,40 EUR) Tj\n" +
            "0 -30 Td\n" +
            "(MwSt.: 150,41 EUR) Tj\n" +
            "0 -30 Td\n" +
            "(Gesamtbetrag: 1.693,81 EUR) Tj\n" +
            "ET\n" +
            "endstream endobj\n" +
            "5 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj\n" +
            "6 0 obj << /Length 100 >> stream\n" +
            "BT\n" +
            "/F1 12 Tf\n" +
            "50 700 Td\n" +
            "(Seite 2 - Weitere Details) Tj\n" +
            "0 -20 Td\n" +
            "(Artikelposition 1) Tj\n" +
            "0 -20 Td\n" +
            "(Artikelposition 2) Tj\n" +
            "ET\n" +
            "endstream endobj\n" +
            "xref\n" +
            "0 7\n" +
            "0000000000 65535 f\n" +
            "0000000009 00000 n\n" +
            "0000000056 00000 n\n" +
            "0000000119 00000 n\n" +
            "0000000307 00000 n\n" +
            "0000000606 00000 n\n" +
            "0000000794 00000 n\n" +
            "trailer << /Size 7 /Root 1 0 R >>\n" +
            "startxref\n" +
            "943\n" +
            "%%EOF";
        
        byte[] pdfBytes = pdfContent.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1);
        
        PDFBoxTextExtractor extractor = new PDFBoxTextExtractor();
        PDFBoxTextExtractor.PdfTextExtractionResult result = extractor.extractText(
            new ByteArrayInputStream(pdfBytes)
        );
        
        // Log Ergebnisse
        log.info("\n📊 TEST-ERGEBNIS:");
        log.info("  Dokumenttyp: {}", result.documentType());
        log.info("  Status: {}", result.status());
        log.info("  Seiten: {}", result.pageCount());
        log.info("  Zeichen: {}", result.characterCount());
        log.info("  Zeilen: {}", result.nonEmptyLineCount());
        
        log.info("\n📝 Pro Seite:");
        for (int i = 0; i < result.textPerPage().size(); i++) {
            String text = result.textPerPage().get(i);
            long lines = text.lines().filter(s -> !s.trim().isEmpty()).count();
            log.info("  Seite {}: {} Zeichen, {} Zeilen", i+1, text.length(), lines);
        }
        
        log.info("\n📄 ROHTEXT:");
        log.info(result.rawText());
        
        // Assertions
        assertEquals(2, result.pageCount(), "Sollte 2 Seiten haben");
        assertEquals(InvoiceDocumentType.TEXT_PDF, result.documentType(), "Sollte TEXT_PDF sein");
        assertEquals(InvoiceParseStatus.TEXT_EXTRACTED, result.status(), "Status sollte TEXT_EXTRACTED sein");
        assertTrue(result.characterCount() >= 100, "Sollte mind. 100 Zeichen haben");
        assertTrue(result.nonEmptyLineCount() >= 5, "Sollte mind. 5 Zeilen haben");
        assertTrue(result.rawText().contains("2026/00442"), "Rechnungsnummer sollte vorkommen");
        assertTrue(result.rawText().contains("Marzouk"), "Lieferant sollte vorkommen");
        assertTrue(result.rawText().contains("1.693,81"), "Gesamtbetrag sollte vorkommen");
        
        log.info("\n✅ TEST ERFOLGREICH");
    }
    
    @Test
    public void testScanPdfWithoutText() throws IOException {
        // Minimale PDF ohne Text (simuliert Scan)
        String emptyPdf = "%PDF-1.4\n" +
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
            "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\n" +
            "xref\n" +
            "0 4\n" +
            "0000000000 65535 f\n" +
            "0000000009 00000 n\n" +
            "0000000056 00000 n\n" +
            "0000000115 00000 n\n" +
            "trailer << /Size 4 /Root 1 0 R >>\n" +
            "startxref\n" +
            "190\n" +
            "%%EOF";
        
        byte[] pdfBytes = emptyPdf.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1);
        
        PDFBoxTextExtractor extractor = new PDFBoxTextExtractor();
        PDFBoxTextExtractor.PdfTextExtractionResult result = extractor.extractText(
            new ByteArrayInputStream(pdfBytes)
        );
        
        log.info("\n📊 SCAN-TEST-ERGEBNIS:");
        log.info("  Dokumenttyp: {}", result.documentType());
        log.info("  Status: {}", result.status());
        log.info("  Seiten: {}", result.pageCount());
        log.info("  Zeichen: {}", result.characterCount());
        
        // Assertions
        assertEquals(InvoiceDocumentType.SCANNED_PDF, result.documentType(), "Sollte SCANNED_PDF sein");
        assertEquals(InvoiceParseStatus.OCR_REQUIRED, result.status(), "Status sollte OCR_REQUIRED sein");
        assertTrue(result.characterCount() < 100, "Sollte weniger als 100 Zeichen haben");
        
        log.info("\n✅ SCAN-TEST ERFOLGREICH - OCR erforderlich");
    }
}
