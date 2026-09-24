package storebackend.enums;

/**
 * Status der Rechnungsanalyse.
 * 
 * Unterscheidet zwischen direktem PDF-Text und OCR-Extraktion.
 */
public enum InvoiceParseStatus {
    /**
     * Analyse noch nicht gestartet.
     */
    NOT_STARTED,
    
    /**
     * Text-Extraktion läuft (PDFBox).
     */
    EXTRACTING,
    
    /**
     * Text erfolgreich aus PDF extrahiert (eingebetteter Text).
     * Verwendet für TEXT_PDF mit PDFBox.
     */
    TEXT_EXTRACTED,
    
    /**
     * OCR erforderlich (keine/wenig eingebetteter Text).
     * Wird von PDFBoxTextExtractor gesetzt bei SCANNED_PDF.
     */
    OCR_REQUIRED,
    
    /**
     * OCR läuft (Tesseract).
     */
    OCR_RUNNING,
    
    /**
     * OCR erfolgreich abgeschlossen.
     * Verwendet für SCANNED_PDF nach erfolgreicher OCR.
     */
    OCR_COMPLETED,
    
    /**
     * Analyse fehlgeschlagen (Fehler, Timeout, verschlüsselt, etc.).
     */
    FAILED
}
