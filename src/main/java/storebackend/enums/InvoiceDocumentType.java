package storebackend.enums;

/**
 * Typ des hochgeladenen Dokuments basierend auf Textextraktion.
 * 
 * - TEXT_PDF: PDF mit eingebettetem Text (kann direkt extrahiert werden)
 * - SCANNED_PDF: PDF ohne lesbaren Text (gescannt/fotografiert, OCR erforderlich)
 * - IMAGE: Bilddatei (JPEG, PNG, WEBP)
 * - UNKNOWN: Typ konnte nicht bestimmt werden
 */
public enum InvoiceDocumentType {
    /**
     * PDF mit eingebettetem Text (>100 lesbare Zeichen gefunden).
     * Kann mit PDFBox direkt ausgelesen werden.
     */
    TEXT_PDF,
    
    /**
     * PDF ohne ausreichend Text (<100 Zeichen).
     * Wahrscheinlich gescanntes Dokument - OCR erforderlich.
     */
    SCANNED_PDF,
    
    /**
     * Bilddatei (JPEG, PNG, WEBP).
     * OCR erforderlich für Textextraktion.
     */
    IMAGE,
    
    /**
     * Dokumenttyp konnte nicht bestimmt werden.
     */
    UNKNOWN
}
