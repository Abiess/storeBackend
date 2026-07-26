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
import storebackend.entity.SupplierInvoiceParseResult;
import storebackend.entity.User;
import storebackend.enums.InvoiceDocumentType;
import storebackend.enums.InvoiceParseStatus;
import storebackend.repository.StoreRepository;
import storebackend.repository.SupplierInvoiceParseResultRepository;
import storebackend.dto.ParsedInvoiceFields;
import storebackend.service.*;
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
    private final InvoiceFieldParser invoiceFieldParser;
    private final InvoiceParseService invoiceParseService;
    private final SupplierInvoiceParseResultRepository parseResultRepository;
    private final SupplierCorrectionService supplierCorrectionService;
    
    // Phase 3B-1B: Line item services
    private final InvoiceLineDTOMapper lineDTOMapper;
    private final SupplierProductMappingService productMappingService;
    private final InvoiceLineUpdateService lineUpdateService;

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

    /**
     * Parse-Endpunkt mit Cache: OCR + strukturiertes Parsing.
     * Verwendet den neuen InvoiceParseService mit Checksummen und Cache.
     */
    @Operation(summary = "Parse invoice with cache", 
               description = "Parse invoice using OCR + field extraction with intelligent caching. " +
                            "Results are cached based on document checksum and parser version.")
    @PostMapping("/documents/{documentId}/parse")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<Map<String, Object>> parseInvoiceWithCache(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "6") Integer psmMode,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        log.info("Parse request: storeId={}, documentId={}, psmMode={}, force={}", 
                 storeId, documentId, psmMode, force);
        
        if (psmMode == null || (psmMode != 3 && psmMode != 4 && psmMode != 6)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "FAILED",
                    "errorMessage", "Erlaubte PSM-Modi sind 3, 4 und 6."
            ));
        }

        try {
            SupplierInvoiceParseResult result = invoiceParseService.parse(storeId, documentId, psmMode, force);
            
            // Response zusammenstellen
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("documentId", documentId);
            response.put("status", result.getParseStatus().name());
            response.put("cached", !force && result.getParsedAt() != null);
            response.put("parsedAt", result.getParsedAt());
            response.put("parserVersion", result.getParserVersion());
            
            // OCR Metadaten
            Map<String, Object> ocrInfo = new LinkedHashMap<>();
            ocrInfo.put("engine", result.getOcrEngine() != null ? result.getOcrEngine() : result.getExtractionMethod());
            ocrInfo.put("languages", result.getOcrLanguages() != null ? 
                List.of(result.getOcrLanguages().split(",")) : List.of());
            ocrInfo.put("pageCount", result.getPageCount());
            ocrInfo.put("durationMs", result.getDurationMs());
            ocrInfo.put("rawTextLength", result.getRawText() != null ? result.getRawText().length() : 0);
            response.put("ocr", ocrInfo);
            
            // Strukturierte Felder
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("supplierName", result.getSupplierName());
            fields.put("invoiceNumber", result.getInvoiceNumber());
            fields.put("invoiceDate", result.getInvoiceDate());
            fields.put("deliveryDate", result.getDeliveryDate());
            fields.put("netAmount", result.getNetAmount());
            fields.put("taxAmount", result.getTaxAmount());
            fields.put("grossAmount", result.getGrossAmount());
            fields.put("currency", result.getCurrency());
            response.put("fields", fields);
            
            // Phase 3A: Field Sources
            Map<String, Object> fieldSources = new LinkedHashMap<>();
            if (result.getSupplierNameSource() != null) {
                fieldSources.put("supplierName", result.getSupplierNameSource());
            }
            response.put("fieldSources", fieldSources);
            
            // Confidence und Warnings
            response.put("confidence", result.getConfidenceJson());
            response.put("warnings", result.getWarningsJson());
            
            // Rohtext (für Debugging)
            response.put("rawText", result.getRawText());
            
            // Phase 3B-1B: Line items
            List<storebackend.entity.SupplierInvoiceLine> lines = invoiceParseService.getLineItems(storeId, documentId);
            response.put("lines", lineDTOMapper.toDTOList(lines));
            response.put("lineSummary", lineDTOMapper.calculateSummary(lines));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Parse failed for documentId={}: {}", documentId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "FAILED",
                            "errorMessage", e.getMessage()
                    ));
        }
    }

    /**
     * GET gespeichertes Parse-Ergebnis (ohne OCR auszulösen).
     * Frontend ruft dies zuerst auf beim Öffnen eines Dokuments.
     */
    @Operation(summary = "Get cached parse result", 
               description = "Retrieve previously cached parse result without triggering OCR. " +
                            "Returns 404 if no result exists yet.")
    @GetMapping("/documents/{documentId}/parse-result")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<Map<String, Object>> getParseResult(
            @PathVariable Long storeId,
            @PathVariable Long documentId
    ) {
        log.debug("GET parse-result: storeId={}, documentId={}", storeId, documentId);
        
        return invoiceParseService.getParseResult(storeId, documentId)
                .map(result -> {
                    Map<String, Object> response = new LinkedHashMap<>();
                    response.put("documentId", documentId);
                    response.put("status", result.getParseStatus().name());
                    response.put("cached", true);
                    response.put("parsedAt", result.getParsedAt());
                    response.put("parserVersion", result.getParserVersion());
                    
                    // OCR Metadaten
                    Map<String, Object> ocrInfo = new LinkedHashMap<>();
                    ocrInfo.put("engine", result.getOcrEngine() != null ? result.getOcrEngine() : result.getExtractionMethod());
                    ocrInfo.put("languages", result.getOcrLanguages() != null ? 
                        List.of(result.getOcrLanguages().split(",")) : List.of());
                    ocrInfo.put("pageCount", result.getPageCount());
                    ocrInfo.put("durationMs", result.getDurationMs());
                    ocrInfo.put("rawTextLength", result.getRawText() != null ? result.getRawText().length() : 0);
                    response.put("ocr", ocrInfo);
                    
                    Map<String, Object> fields = new LinkedHashMap<>();
                    fields.put("supplierName", result.getSupplierName());
                    fields.put("invoiceNumber", result.getInvoiceNumber());
                    fields.put("invoiceDate", result.getInvoiceDate());
                    fields.put("deliveryDate", result.getDeliveryDate());
                    fields.put("netAmount", result.getNetAmount());
                    fields.put("taxAmount", result.getTaxAmount());
                    fields.put("grossAmount", result.getGrossAmount());
                    fields.put("currency", result.getCurrency());
                    response.put("fields", fields);
                    
                    // Phase 3A: Field Sources
                    Map<String, Object> fieldSources = new LinkedHashMap<>();
                    if (result.getSupplierNameSource() != null) {
                        fieldSources.put("supplierName", result.getSupplierNameSource());
                    }
                    response.put("fieldSources", fieldSources);
                    
                    response.put("confidence", result.getConfidenceJson());
                    response.put("warnings", result.getWarningsJson());
                    response.put("rawText", result.getRawText());
                    
                    // Phase 3B-1B: Line items
                    List<storebackend.entity.SupplierInvoiceLine> lines = invoiceParseService.getLineItems(storeId, documentId);
                    response.put("lines", lineDTOMapper.toDTOList(lines));
                    response.put("lineSummary", lineDTOMapper.calculateSummary(lines));
                    
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Confirm supplier name correction (Phase 3A Learning System).
     * Stores user-confirmed corrections for future invoices.
     */
    @Operation(summary = "Confirm supplier name correction", 
               description = "Learn supplier name correction for future invoices (Phase 3A)")
    @PostMapping("/documents/{documentId}/corrections/supplier-name")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> confirmSupplierNameCorrection(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @RequestBody storebackend.dto.ConfirmSupplierCorrectionRequest request,
            @AuthenticationPrincipal User user
    ) {
        log.info("Confirming supplier correction: storeId={}, documentId={}, raw={}, corrected={}",
                storeId, documentId, request.getRawValue(), request.getCorrectedValue());
        
        try {
            // Verify document belongs to store
            SupplierInvoiceDocument document = documentService.getDocument(documentId, storeId);
            
            // Store correction if requested
            if (request.isRememberForFuture()) {
                storebackend.entity.SupplierFieldCorrection correction = 
                    supplierCorrectionService.confirmSupplierNameCorrection(
                        storeId,
                        request.getRawValue(),
                        request.getCorrectedValue(),
                        null,  // supplierId (future)
                        user != null ? user.getId() : null
                    );
                
                // Update parse result for this document
                parseResultRepository.findByDocumentIdAndStoreId(documentId, storeId)
                    .ifPresent(result -> {
                        result.setSupplierName(correction.getCorrectedValue());
                        result.setSupplierNameSource("USER_EDITED");
                        parseResultRepository.save(result);
                        log.info("Updated parse result with user-confirmed supplier name");
                    });
                
                // Build response
                storebackend.dto.ConfirmSupplierCorrectionResponse response = 
                    new storebackend.dto.ConfirmSupplierCorrectionResponse();
                response.setFieldType(correction.getFieldType());
                response.setRawValue(correction.getRawValue());
                response.setCorrectedValue(correction.getCorrectedValue());
                response.setConfirmationCount(correction.getConfirmationCount());
                response.setActive(correction.getActive());
                
                return ResponseEntity.ok(response);
            } else {
                // Just update this document's parse result
                parseResultRepository.findByDocumentIdAndStoreId(documentId, storeId)
                    .ifPresent(result -> {
                        result.setSupplierName(request.getCorrectedValue());
                        result.setSupplierNameSource("USER_EDITED");
                        parseResultRepository.save(result);
                    });
                
                return ResponseEntity.ok(Map.of(
                    "message", "Supplier name updated for this document only",
                    "correctedValue", request.getCorrectedValue()
                ));
            }
            
        } catch (SupplierCorrectionService.ConflictingCorrectionException e) {
            log.warn("Conflicting correction: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "CONFLICTING_CORRECTION", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid correction request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "INVALID_REQUEST", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to confirm supplier correction", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "INTERNAL_ERROR", "message", e.getMessage()));
        }
    }
    
    // ==================================================================================
    // Phase 3B-1B: Invoice Line Management Endpoints
    // ==================================================================================
    
    /**
     * Update invoice line (user corrections).
     */
    @Operation(summary = "Update invoice line", 
               description = "Update line fields after user correction. Sets userCorrected=true and status=CONFIRMED.")
    @PutMapping("/documents/{documentId}/lines/{lineId}")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> updateInvoiceLine(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @PathVariable Long lineId,
            @RequestBody storebackend.dto.UpdateLineRequest request
    ) {
        log.info("Update line request: storeId={}, documentId={}, lineId={}", storeId, documentId, lineId);
        
        try {
            storebackend.entity.SupplierInvoiceLine updated = 
                lineUpdateService.updateLine(storeId, documentId, lineId, request);
            
            return ResponseEntity.ok(lineDTOMapper.toDTO(updated));
            
        } catch (SecurityException e) {
            log.warn("Security violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to update line: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
    
    /**
     * Map invoice line to product.
     */
    @Operation(summary = "Map line to product", 
               description = "Assign a store product to an invoice line. Optionally create learned mapping with rememberForFuture=true.")
    @PostMapping("/documents/{documentId}/lines/{lineId}/product-mapping")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> mapLineToProduct(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @PathVariable Long lineId,
            @RequestBody storebackend.dto.ProductMappingRequest request
    ) {
        log.info("Map line to product: storeId={}, documentId={}, lineId={}, productId={}, remember={}",
                storeId, documentId, lineId, request.getProductId(), request.getRememberForFuture());
        
        try {
            storebackend.entity.SupplierInvoiceLine mapped = 
                lineUpdateService.mapToProduct(storeId, documentId, lineId, request);
            
            return ResponseEntity.ok(lineDTOMapper.toDTO(mapped));
            
        } catch (SecurityException e) {
            log.warn("Security violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to map line to product: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
    
    /**
     * Bulk confirm lines.
     */
    @Operation(summary = "Bulk confirm lines", 
               description = "Confirm multiple lines at once. Optionally skip lines with warnings.")
    @PostMapping("/documents/{documentId}/lines/bulk-confirm")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> bulkConfirmLines(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @RequestBody Map<String, Object> request
    ) {
        log.info("Bulk confirm lines: storeId={}, documentId={}", storeId, documentId);
        
        try {
            @SuppressWarnings("unchecked")
            List<Long> lineIds = (List<Long>) request.get("lineIds");
            Boolean onlyWithoutWarnings = (Boolean) request.getOrDefault("onlyWithoutWarnings", false);
            
            if (lineIds == null || lineIds.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Bad Request", "message", "lineIds cannot be empty"));
            }
            
            // Convert Integer to Long if needed (JSON deserialization quirk)
            List<Long> convertedIds = new java.util.ArrayList<>();
            for (Object id : lineIds) {
                if (id instanceof Integer) {
                    convertedIds.add(((Integer) id).longValue());
                } else if (id instanceof Long) {
                    convertedIds.add((Long) id);
                } else {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Bad Request", "message", "Invalid lineId type: " + id.getClass()));
                }
            }
            
            storebackend.service.InvoiceLineUpdateService.BulkConfirmResult result = 
                lineUpdateService.bulkConfirm(storeId, documentId, convertedIds, onlyWithoutWarnings);
            
            // Get updated summary
            List<storebackend.entity.SupplierInvoiceLine> lines = invoiceParseService.getLineItems(storeId, documentId);
            storebackend.dto.LineSummaryDTO summary = lineDTOMapper.calculateSummary(lines);
            
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("requested", result.requested);
            response.put("confirmed", result.confirmed);
            response.put("skipped", result.skipped);
            response.put("lineSummary", summary);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to bulk confirm lines: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
    
    /**
     * Phase 3B-2: Manually create a new invoice line.
     */
    @Operation(summary = "Create invoice line manually", 
               description = "Add a new invoice line manually (for missing OCR positions).")
    @PostMapping("/documents/{documentId}/lines")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> createInvoiceLine(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @RequestBody storebackend.dto.CreateLineRequest request
    ) {
        log.info("Create line request: storeId={}, documentId={}", storeId, documentId);
        
        try {
            storebackend.entity.SupplierInvoiceLine created = 
                lineUpdateService.createLine(storeId, documentId, request);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(lineDTOMapper.toDTO(created));
            
        } catch (SecurityException e) {
            log.warn("Security violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create line: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
    
    /**
     * Phase 3B-2: Delete an invoice line.
     */
    @Operation(summary = "Delete invoice line", 
               description = "Delete a wrongly detected invoice line (e.g. metadata recognized as product).")
    @DeleteMapping("/documents/{documentId}/lines/{lineId}")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> deleteInvoiceLine(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @PathVariable Long lineId
    ) {
        log.info("Delete line request: storeId={}, documentId={}, lineId={}", storeId, documentId, lineId);
        
        try {
            lineUpdateService.deleteLine(storeId, documentId, lineId);
            
            return ResponseEntity.noContent().build();
            
        } catch (SecurityException e) {
            log.warn("Security violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to delete line: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
    
    /**
     * Phase 3B-2: Split an invoice line at text position.
     */
    @Operation(summary = "Split invoice line", 
               description = "Split a line containing multiple products at a text position.")
    @PostMapping("/documents/{documentId}/lines/{lineId}/split")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> splitInvoiceLine(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @PathVariable Long lineId,
            @RequestBody storebackend.dto.SplitLineRequest request
    ) {
        log.info("Split line request: storeId={}, documentId={}, lineId={}, splitAt={}", 
                storeId, documentId, lineId, request.getSplitPosition());
        
        try {
            List<storebackend.entity.SupplierInvoiceLine> result = 
                lineUpdateService.splitLine(storeId, documentId, lineId, request.getSplitPosition());
            
            return ResponseEntity.ok(result.stream().map(lineDTOMapper::toDTO).toList());
            
        } catch (SecurityException e) {
            log.warn("Security violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to split line: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
    
    /**
     * Phase 3B-2: Merge invoice line with next line.
     */
    @Operation(summary = "Merge invoice line with next", 
               description = "Merge a line with the next line (for split product descriptions).")
    @PostMapping("/documents/{documentId}/lines/{lineId}/merge-next")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> mergeInvoiceLineWithNext(
            @PathVariable Long storeId,
            @PathVariable Long documentId,
            @PathVariable Long lineId
    ) {
        log.info("Merge line request: storeId={}, documentId={}, lineId={}", storeId, documentId, lineId);
        
        try {
            storebackend.entity.SupplierInvoiceLine merged = 
                lineUpdateService.mergeWithNext(storeId, documentId, lineId);
            
            return ResponseEntity.ok(lineDTOMapper.toDTO(merged));
            
        } catch (SecurityException e) {
            log.warn("Security violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to merge line: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", e.getMessage()));
        }
    }
}
