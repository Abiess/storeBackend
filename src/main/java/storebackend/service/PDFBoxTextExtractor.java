package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import storebackend.enums.InvoiceDocumentType;
import storebackend.enums.InvoiceParseStatus;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * PDFBox-basierte Textextraktion aus PDF-Dokumenten.
 * 
 * Phase 2A: NUR lokale Verarbeitung, KEINE externen AI-Services.
 * 
 * Funktionen:
 * - Eingebetteten Text mit PDFBox extrahieren
 * - Seiten einzeln analysieren
 * - Dokumenttyp bestimmen (TEXT_PDF vs SCANNED_PDF)
 * - Sinnvollen Text von Metadaten unterscheiden
 */
@Service
@Slf4j
public class PDFBoxTextExtractor {
    
    /**
     * Mindestzahl sinnvoller Zeichen für TEXT_PDF.
     * Weniger = wahrscheinlich Scan ohne eingebetteten Text.
     */
    private static final int MIN_CHARS_FOR_TEXT_PDF = 100;
    
    /**
     * Mindestzahl nicht-leerer Zeilen für TEXT_PDF.
     */
    private static final int MIN_LINES_FOR_TEXT_PDF = 5;
    
    /**
     * Extrahiert Text aus PDF und analysiert Dokumenttyp.
     * 
     * @param inputStream PDF-Datei als InputStream
     * @return Extraktionsergebnis mit Rohtext, Statistiken und Dokumenttyp
     * @throws IOException bei Lesefehler oder beschädigter PDF
     */
    public PdfTextExtractionResult extractText(InputStream inputStream) throws IOException {
        try (PDDocument document = PDDocument.load(inputStream)) {
            
            // Verschlüsselung prüfen
            if (document.isEncrypted()) {
                log.warn("⚠️ PDF ist verschlüsselt - Extraktion nicht möglich");
                return new PdfTextExtractionResult(
                    "",
                    0,
                    0,
                    document.getNumberOfPages(),
                    List.of(),
                    InvoiceDocumentType.UNKNOWN,
                    InvoiceParseStatus.FAILED,
                    "PDF ist verschlüsselt und kann nicht gelesen werden"
                );
            }
            
            int pageCount = document.getNumberOfPages();
            
            if (pageCount == 0) {
                log.warn("⚠️ PDF enthält keine Seiten");
                return new PdfTextExtractionResult(
                    "",
                    0,
                    0,
                    0,
                    List.of(),
                    InvoiceDocumentType.UNKNOWN,
                    InvoiceParseStatus.FAILED,
                    "PDF enthält keine Seiten"
                );
            }
            
            // Text pro Seite extrahieren
            PDFTextStripper stripper = new PDFTextStripper();
            List<String> textPerPage = new ArrayList<>();
            StringBuilder fullText = new StringBuilder();
            
            for (int pageNum = 1; pageNum <= pageCount; pageNum++) {
                stripper.setStartPage(pageNum);
                stripper.setEndPage(pageNum);
                
                String pageText = stripper.getText(document);
                textPerPage.add(pageText);
                fullText.append(pageText);
            }
            
            String rawText = fullText.toString();
            
            // Statistiken berechnen
            int characterCount = countMeaningfulCharacters(rawText);
            int nonEmptyLineCount = countNonEmptyLines(rawText);
            
            // Dokumenttyp bestimmen
            InvoiceDocumentType documentType;
            InvoiceParseStatus status;
            String errorMessage = null;
            
            if (characterCount >= MIN_CHARS_FOR_TEXT_PDF && nonEmptyLineCount >= MIN_LINES_FOR_TEXT_PDF) {
                documentType = InvoiceDocumentType.TEXT_PDF;
                status = InvoiceParseStatus.TEXT_EXTRACTED;
                log.info("✅ TEXT_PDF erkannt: {} Zeichen, {} nicht-leere Zeilen, {} Seiten",
                    characterCount, nonEmptyLineCount, pageCount);
            } else {
                documentType = InvoiceDocumentType.SCANNED_PDF;
                status = InvoiceParseStatus.OCR_REQUIRED;
                log.info("⚠️ SCANNED_PDF erkannt: {} Zeichen, {} Zeilen (< {} / {} erforderlich) - OCR benötigt",
                    characterCount, nonEmptyLineCount, MIN_CHARS_FOR_TEXT_PDF, MIN_LINES_FOR_TEXT_PDF);
                errorMessage = String.format(
                    "Dokument enthält keinen ausreichenden Text (%d Zeichen, %d Zeilen). OCR erforderlich.",
                    characterCount, nonEmptyLineCount
                );
            }
            
            return new PdfTextExtractionResult(
                rawText,
                characterCount,
                nonEmptyLineCount,
                pageCount,
                textPerPage,
                documentType,
                status,
                errorMessage
            );
            
        } catch (IOException e) {
            log.error("❌ Fehler beim Laden der PDF: {}", e.getMessage());
            throw new IOException("PDF konnte nicht geladen werden: " + e.getMessage(), e);
        }
    }
    
    /**
     * Zählt "sinnvolle" Zeichen (keine Whitespace, Steuerzeichen oder PDF-Metadaten).
     */
    private int countMeaningfulCharacters(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        
        int count = 0;
        for (char c : text.toCharArray()) {
            // Nur druckbare Zeichen (keine Steuerzeichen, keine Whitespace außer Leerzeichen)
            if (Character.isLetterOrDigit(c) || 
                Character.isWhitespace(c) && c == ' ' ||
                isPunctuation(c)) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Zählt nicht-leere Zeilen (nach Trimmen).
     */
    private int countNonEmptyLines(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        
        String[] lines = text.split("\\r?\\n");
        int count = 0;
        
        for (String line : lines) {
            if (!line.trim().isEmpty()) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Prüft ob Zeichen ein Satzzeichen ist.
     */
    private boolean isPunctuation(char c) {
        return c == '.' || c == ',' || c == ';' || c == ':' || c == '!' || c == '?' ||
               c == '-' || c == '/' || c == '(' || c == ')' || c == '[' || c == ']' ||
               c == '{' || c == '}' || c == '"' || c == '\'' || c == '€' || c == '$';
    }
    
    /**
     * Ergebnis der PDF-Textextraktion.
     */
    public record PdfTextExtractionResult(
        /**
         * Vollständiger extrahierter Rohtext (alle Seiten).
         */
        String rawText,
        
        /**
         * Anzahl "sinnvoller" Zeichen (ohne Whitespace/Steuerzeichen).
         */
        int characterCount,
        
        /**
         * Anzahl nicht-leerer Zeilen.
         */
        int nonEmptyLineCount,
        
        /**
         * Anzahl Seiten im PDF.
         */
        int pageCount,
        
        /**
         * Extrahierter Text pro Seite (Liste, Index 0 = Seite 1).
         */
        List<String> textPerPage,
        
        /**
         * Erkannter Dokumenttyp.
         */
        InvoiceDocumentType documentType,
        
        /**
         * Parse-Status nach Extraktion.
         */
        InvoiceParseStatus status,
        
        /**
         * Fehlermeldung bei FAILED oder OCR_REQUIRED.
         */
        String errorMessage
    ) {
        /**
         * Konstruktor ohne Fehlermeldung (für TEXT_EXTRACTED).
         */
        public PdfTextExtractionResult(
            String rawText,
            int characterCount,
            int nonEmptyLineCount,
            int pageCount,
            List<String> textPerPage,
            InvoiceDocumentType documentType,
            InvoiceParseStatus status
        ) {
            this(rawText, characterCount, nonEmptyLineCount, pageCount, textPerPage, documentType, status, null);
        }
    }
}
