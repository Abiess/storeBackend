package storebackend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Response DTO für OCR-Test-Endpunkt
 * Gibt das OCR-Ergebnis zurück, ohne es zu speichern
 */
@Data
@Builder
public class InvoiceOcrResponseDTO {
    
    private Long documentId;
    private String documentType; // TEXT_PDF, SCANNED_PDF, IMAGE, UNKNOWN
    private String status; // OCR_COMPLETED, OCR_FAILED, TEXT_EXTRACTED, etc.
    private String engine; // "pdfbox" oder "tesseract-cli"
    private List<String> languages; // z.B. ["deu", "eng"]
    private Integer psmMode; // 3, 4, 6, etc. (nur bei Tesseract)
    private Integer pageCount;
    private Long durationMs;
    private Integer characterCount;
    private Integer nonEmptyLineCount;
    private String rawText; // Vollständiger OCR-Text
    private List<String> textPerPage; // Text pro Seite
    private String errorMessage; // Bei Fehler
}
