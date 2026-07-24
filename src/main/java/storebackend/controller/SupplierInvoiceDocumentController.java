package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.SupplierInvoiceDocumentDTO;
import storebackend.entity.Store;
import storebackend.entity.SupplierInvoiceDocument;
import storebackend.entity.User;
import storebackend.enums.InvoiceDocumentType;
import storebackend.enums.InvoiceParseStatus;
import storebackend.repository.StoreRepository;
import storebackend.service.LocalInvoiceOcrService;
import storebackend.service.PDFBoxTextExtractor;
import storebackend.service.SupplierInvoiceDocumentService;
import storebackend.util.StoreAccessChecker;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores/{storeId}/supplier-invoices")
@Tag(name = "Supplier Invoice Documents", description = "Secure upload and management of supplier invoices (PDF and images)")
@RequiredArgsConstructor
@Slf4j
public class SupplierInvoiceDocumentController {

    private final SupplierInvoiceDocumentService documentService;
    private final StoreRepository storeRepository;
    private final PDFBoxTextExtractor pdfBoxTextExtractor;
    private final LocalInvoiceOcrService localInvoiceOcrService;

    /**
     * Upload einer Lieferantenrechnung (PDF oder Bild)
     */
    @Operation(summary = "Upload supplier invoice", description = "Upload a supplier invoice document (PDF, JPEG, PNG, WEBP). Max 10MB. Stored in PRIVATE bucket.")
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> uploadDocument(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Document file (PDF or image)", required = true)
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            // Zusätzliche Sicherheitsprüfung (PreAuthorize sollte das schon gemacht haben)
            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized to upload documents to this store");
            }

            SupplierInvoiceDocumentDTO document = documentService.uploadDocument(file, store, user);

            log.info("✅ Lieferantenrechnung hochgeladen: Store={}, User={}, Datei={}",
                    storeId, user.getEmail(), file.getOriginalFilename());

            return ResponseEntity.ok(document);

        } catch (Exception e) {
            log.error("Fehler beim Upload von Lieferantenrechnung", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Liste aller Dokumente eines Stores
     */
    @Operation(summary = "List all supplier invoice documents")
    @GetMapping("/documents")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> listDocuments(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).build();
            }

            List<SupplierInvoiceDocumentDTO> documents = documentService.getDocumentsByStore(storeId);
            return ResponseEntity.ok(documents);

        } catch (Exception e) {
            log.error("Fehler beim Abrufen der Dokumentenliste", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Einzelnes Dokument-Metadaten abrufen
     */
    @Operation(summary = "Get single document metadata")
    @GetMapping("/documents/{documentId}")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> getDocument(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).build();
            }

            SupplierInvoiceDocument document = documentService.getDocument(documentId, storeId);
            // TODO: Convert to DTO
            return ResponseEntity.ok(document);

        } catch (Exception e) {
            log.error("Fehler beim Abrufen des Dokuments", e);
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    /**
     * Dokument-Inhalt herunterladen (authentifiziert, aus privatem Bucket)
     */
    @Operation(summary = "Download document content", description = "Download file from PRIVATE bucket. Requires authentication and store ownership.")
    @GetMapping("/documents/{documentId}/content")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> downloadDocument(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            // Dokument abrufen (mit Multi-Tenant-Prüfung)
            SupplierInvoiceDocument document = documentService.getDocument(documentId, storeId);

            // Datei-Inhalt aus privatem Bucket laden
            InputStream fileStream = documentService.getDocumentContent(documentId, storeId);

            // HTTP-Response vorbereiten
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(document.getMimeType()));
            headers.setContentLength(document.getFileSize());
            headers.setContentDispositionFormData("inline", document.getOriginalFilename());

            log.info("✅ Dokument wird heruntergeladen: Store={}, User={}, Dokument={}",
                    storeId, user.getEmail(), document.getOriginalFilename());

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(new InputStreamResource(fileStream));

        } catch (Exception e) {
            log.error("Fehler beim Download des Dokuments", e);
            return ResponseEntity.status(500).body("Error downloading document: " + e.getMessage());
        }
    }

    /**
     * Dokument löschen
     */
    @Operation(summary = "Delete document")
    @DeleteMapping("/documents/{documentId}")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> deleteDocument(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body("Unauthorized");
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).body("Not authorized");
            }

            documentService.deleteDocument(documentId, storeId);

            log.info("✅ Dokument gelöscht: Store={}, User={}, DokumentID={}",
                    storeId, user.getEmail(), documentId);

            return ResponseEntity.ok().body("Document deleted successfully");

        } catch (Exception e) {
            log.error("Fehler beim Löschen des Dokuments", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Anzahl Dokumente für einen Store
     */
    @Operation(summary = "Count documents")
    @GetMapping("/documents/count")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> countDocuments(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).build();
            }

            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Store not found"));

            if (!StoreAccessChecker.isOwner(store, user)) {
                return ResponseEntity.status(403).build();
            }

            long count = documentService.countDocumentsByStore(storeId);
            return ResponseEntity.ok().body(new CountResponse(count));

        } catch (Exception e) {
            log.error("Fehler beim Zählen der Dokumente", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    record CountResponse(long count) {}

    /**
     * OCR-Test-Endpunkt (Phase 2B)
     * Extrahiert Text ohne Speicherung. Gibt Map<String, Object> zurück.
     */
    @Operation(summary = "Extract text with OCR (test endpoint)")
    @PostMapping("/documents/{documentId}/ocr")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<Map<String, Object>> runOcr(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "6") Integer psmMode
    ) {
        if (psmMode == null || (psmMode != 3 && psmMode != 4 && psmMode != 6)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "FAILED",
                    "errorMessage", "Erlaubte PSM-Modi sind 3, 4 und 6."
            ));
        }

        SupplierInvoiceDocument document =
                documentService.getDocument(documentId, storeId);

        String mimeType = document.getMimeType();

        try {
            if ("application/pdf".equalsIgnoreCase(mimeType)) {
                byte[] content;

                try (InputStream input =
                             documentService.getDocumentContent(documentId, storeId)) {
                    content = input.readAllBytes();
                }

                PDFBoxTextExtractor.PdfTextExtractionResult pdfResult;

                try (InputStream pdfInput = new ByteArrayInputStream(content)) {
                    pdfResult = pdfBoxTextExtractor.extractText(pdfInput);
                }

                if (pdfResult.status() == InvoiceParseStatus.TEXT_EXTRACTED) {
                    Map<String, Object> response = new LinkedHashMap<>();
                    response.put("documentId", documentId);
                    response.put("documentType", pdfResult.documentType().name());
                    response.put("status", pdfResult.status().name());
                    response.put("engine", "pdfbox");
                    response.put("languages", List.of());
                    response.put("psmMode", null);
                    response.put("pageCount", pdfResult.pageCount());
                    response.put("durationMs", 0L);
                    response.put("characterCount", pdfResult.characterCount());
                    response.put("nonEmptyLineCount", pdfResult.nonEmptyLineCount());
                    response.put("rawText", pdfResult.rawText());
                    response.put("textPerPage", pdfResult.textPerPage());
                    response.put("errorMessage", pdfResult.errorMessage());

                    return ResponseEntity.ok()
                            .cacheControl(CacheControl.noStore())
                            .body(response);
                }

                if (!localInvoiceOcrService.isTesseractAvailable()) {
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                            .cacheControl(CacheControl.noStore())
                            .body(Map.of(
                                    "documentId", documentId,
                                    "documentType", pdfResult.documentType().name(),
                                    "status", "FAILED",
                                    "errorMessage", "Tesseract ist auf dem Server nicht verfügbar."
                            ));
                }

                LocalInvoiceOcrService.OcrExtractionResult ocrResult;

                try (InputStream ocrInput = new ByteArrayInputStream(content)) {
                    ocrResult =
                            localInvoiceOcrService.extractTextWithOcr(ocrInput, psmMode);
                }

                return buildOcrResponse(documentId, pdfResult.documentType(), ocrResult);
            }

            if ("image/jpeg".equalsIgnoreCase(mimeType)
                    || "image/png".equalsIgnoreCase(mimeType)
                    || "image/webp".equalsIgnoreCase(mimeType)) {

                if (!localInvoiceOcrService.isTesseractAvailable()) {
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                            .cacheControl(CacheControl.noStore())
                            .body(Map.of(
                                    "documentId", documentId,
                                    "documentType", InvoiceDocumentType.IMAGE.name(),
                                    "status", "FAILED",
                                    "errorMessage", "Tesseract ist auf dem Server nicht verfügbar."
                            ));
                }

                try (InputStream input =
                             documentService.getDocumentContent(documentId, storeId)) {

                    LocalInvoiceOcrService.OcrExtractionResult ocrResult =
                            localInvoiceOcrService.extractTextWithOcr(input, psmMode);

                    return buildOcrResponse(
                            documentId,
                            InvoiceDocumentType.IMAGE,
                            ocrResult
                    );
                }
            }

            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .cacheControl(CacheControl.noStore())
                    .body(Map.of(
                            "documentId", documentId,
                            "status", "FAILED",
                            "errorMessage", "Dieser Dateityp wird für OCR nicht unterstützt."
                    ));

        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .cacheControl(CacheControl.noStore())
                    .body(Map.of(
                            "documentId", documentId,
                            "status", "FAILED",
                            "errorMessage", "Das Dokument konnte nicht gelesen werden."
                    ));
        }
    }

    private ResponseEntity<Map<String, Object>> buildOcrResponse(
            Long documentId,
            InvoiceDocumentType documentType,
            LocalInvoiceOcrService.OcrExtractionResult result
    ) {
        Map<String, Object> response = new LinkedHashMap<>();

        response.put("documentId", documentId);
        response.put("documentType", documentType.name());
        response.put("status", result.status().name());
        response.put("engine", result.engine());
        response.put("languages", result.languages());
        response.put("psmMode", result.psmMode());
        response.put("pageCount", result.pageCount());
        response.put("durationMs", result.durationMs());
        response.put("characterCount", countMeaningfulCharacters(result.rawText()));
        response.put("nonEmptyLineCount", countNonEmptyLines(result.rawText()));
        response.put("rawText", result.rawText());
        response.put("textPerPage", result.textPerPage());
        response.put("errorMessage", result.errorMessage());

        HttpStatus status = result.status() == InvoiceParseStatus.OCR_COMPLETED
                ? HttpStatus.OK
                : HttpStatus.UNPROCESSABLE_ENTITY;

        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(response);
    }

    private int countMeaningfulCharacters(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }

        return (int) text.codePoints()
                .filter(cp -> !Character.isWhitespace(cp))
                .filter(cp -> !Character.isISOControl(cp))
                .count();
    }

    private int countNonEmptyLines(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }

        return (int) text.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .count();
    }
}
