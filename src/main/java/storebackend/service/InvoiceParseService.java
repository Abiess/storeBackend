package storebackend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ParsedInvoiceFields;
import storebackend.dto.ParsedInvoiceLine;
import storebackend.entity.SupplierInvoiceDocument;
import storebackend.entity.SupplierInvoiceLine;
import storebackend.entity.SupplierInvoiceParseResult;
import storebackend.enums.InvoiceParseStatus;
import storebackend.enums.LineStatus;
import storebackend.repository.SupplierInvoiceDocumentRepository;
import storebackend.repository.SupplierInvoiceLineRepository;
import storebackend.repository.SupplierInvoiceParseResultRepository;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Zentraler Service für das Parsen von Lieferantenrechnungen mit Cache-System.
 * 
 * Features:
 * - SHA-256 Checksummen zur Cache-Invalidierung
 * - Parser-Version-Tracking für Upgrades
 * - Transaktionale Speicherung
 * - Force-Reload-Unterstützung
 * - OCR + Regex-basiertes Field-Parsing
 * - Phase 3B-1B: Line item parsing + product mapping
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceParseService {
    
    private static final String PARSER_VERSION = "invoice-parser-v3";
    
    private final SupplierInvoiceDocumentRepository documentRepository;
    private final SupplierInvoiceParseResultRepository parseResultRepository;
    private final SupplierInvoiceLineRepository lineRepository;
    private final SupplierInvoiceDocumentService documentService;
    private final LocalInvoiceOcrService ocrService;
    private final InvoiceFieldParser fieldParser;
    private final InvoiceLineItemParser lineItemParser;
    private final SupplierCorrectionService supplierCorrectionService;
    private final SupplierProductMappingService productMappingService;
    private final ObjectMapper objectMapper;
    
    /**
     * Parse-Ergebnis mit Cache-Logik.
     * 
     * @param storeId Store-ID (für Mandantentrennung)
     * @param documentId Dokument-ID
     * @param psmMode Tesseract PSM Mode (6 = assume uniform block)
     * @param force true = Cache ignorieren und neu parsen
     * @return Parse-Ergebnis (aus Cache oder frisch geparst)
     */
    @Transactional
    public SupplierInvoiceParseResult parse(Long storeId, Long documentId, Integer psmMode, boolean force) {
        log.info("Parse request for documentId={}, storeId={}, force={}", documentId, storeId, force);
        
        // 1. Dokument mandantensicher laden
        SupplierInvoiceDocument document = documentRepository
            .findByIdAndStoreId(documentId, storeId)
            .orElseThrow(() -> new RuntimeException("Dokument nicht gefunden: " + documentId));
        
        // 2. Datei-Checksumme berechnen
        String checksum = calculateChecksum(storeId, documentId);
        log.debug("Document checksum: {}", checksum);
        
        // 3. Cache prüfen (wenn nicht force)
        if (!force) {
            Optional<SupplierInvoiceParseResult> cached = parseResultRepository
                .findByDocumentIdAndStoreId(documentId, storeId);
            
            if (cached.isPresent()) {
                SupplierInvoiceParseResult result = cached.get();
                
                // Cache nur verwenden, wenn:
                // - Status = OCR_COMPLETED
                // - Checksumme stimmt
                // - Parser-Version stimmt
                boolean cacheValid = 
                    result.getParseStatus() == InvoiceParseStatus.OCR_COMPLETED &&
                    checksum.equals(result.getDocumentChecksum()) &&
                    PARSER_VERSION.equals(result.getParserVersion());
                
                if (cacheValid) {
                    log.info("Using cached result for documentId={} (parsed at {})", 
                        documentId, result.getParsedAt());
                    return result;
                } else {
                    log.info("Cache invalid for documentId={}: status={}, checksumMatch={}, versionMatch={}", 
                        documentId, result.getParseStatus(),
                        checksum.equals(result.getDocumentChecksum()),
                        PARSER_VERSION.equals(result.getParserVersion()));
                }
            }
        }
        
        // 4. Neues Parsing durchführen
        log.info("Starting fresh parse for documentId={}", documentId);
        
        SupplierInvoiceParseResult result = parseResultRepository
            .findByDocumentIdAndStoreId(documentId, storeId)
            .orElse(new SupplierInvoiceParseResult());
        
        result.setDocument(document);
        result.setStoreId(storeId);
        result.setExtractionMethod("TESSERACT");
        result.setParserVersion(PARSER_VERSION);
        result.setDocumentChecksum(checksum);
        result.setParseStatus(InvoiceParseStatus.OCR_RUNNING);
        result.setStartedAt(LocalDateTime.now());
        
        // Speichern um OCR_RUNNING zu signalisieren (verhindert gleichzeitige Aufrufe)
        result = parseResultRepository.save(result);
        
        try {
            // 5. OCR durchführen
            String rawText;
            LocalInvoiceOcrService.OcrExtractionResult ocrResult;
            try (InputStream input = documentService.getDocumentContent(documentId, storeId)) {
                ocrResult = ocrService.extractTextWithOcr(input, psmMode);
                
                if (ocrResult.status() != InvoiceParseStatus.OCR_COMPLETED) {
                    throw new RuntimeException("OCR fehlgeschlagen: " + ocrResult.errorMessage());
                }
                
                rawText = ocrResult.rawText();
            }
            log.debug("OCR extracted {} characters from {} pages in {}ms", 
                rawText.length(), ocrResult.pageCount(), ocrResult.durationMs());
            
            // 6. Felder parsen
            ParsedInvoiceFields fields = fieldParser.parse(rawText);
            log.debug("Parser found {} fields", countNonNullFields(fields));
            
            // 6a. Apply learned supplier name correction (Phase 3A)
            String supplierName = fields.supplierName();
            String supplierNameSource = "PARSER";
            
            if (supplierName != null && !supplierName.isEmpty()) {
                Optional<storebackend.entity.SupplierFieldCorrection> correction =
                    supplierCorrectionService.findSupplierNameCorrection(storeId, supplierName);
                
                if (correction.isPresent()) {
                    String correctedName = correction.get().getCorrectedValue();
                    log.info("Applying learned supplier correction: '{}' → '{}'", 
                        supplierName, correctedName);
                    supplierName = correctedName;
                    supplierNameSource = "LEARNED_CORRECTION";
                }
            }
            
            // 7. Ergebnis speichern
            result.setRawText(rawText);
            result.setSupplierName(supplierName);
            result.setSupplierNameSource(supplierNameSource);
            result.setInvoiceNumber(fields.invoiceNumber());
            result.setInvoiceDate(fields.invoiceDate());
            result.setDeliveryDate(fields.deliveryDate());
            result.setNetAmount(fields.netAmount());
            result.setTaxAmount(fields.taxAmount());
            result.setGrossAmount(fields.grossAmount());
            result.setCurrency(fields.currency());
            result.setConfidenceJson(fields.confidence());
            result.setWarningsJson(fields.warnings());
            
            // OCR-Metadaten speichern
            result.setPageCount(ocrResult.pageCount());
            result.setDurationMs(ocrResult.durationMs());
            result.setOcrEngine(ocrResult.engine());
            result.setOcrLanguages(ocrResult.languages() != null ? 
                String.join(",", ocrResult.languages()) : null);
            
            result.setParseStatus(InvoiceParseStatus.OCR_COMPLETED);
            result.setParsedAt(LocalDateTime.now());
            result.setCompletedAt(LocalDateTime.now());
            result.setErrorMessage(null);
            
            result = parseResultRepository.save(result);
            log.info("Parse completed for documentId={}", documentId);
            
            // 8. Phase 3B-1B: Parse and save line items
            if (force) {
                // Delete old lines when forcing re-parse
                lineRepository.deleteByDocumentId(documentId);
                log.debug("Deleted old lines for documentId={}", documentId);
            }
            
            try {
                List<ParsedInvoiceLine> parsedLines = lineItemParser.parse(rawText);
                log.info("Parsed {} line items", parsedLines.size());
                
                List<SupplierInvoiceLine> savedLines = saveLineItems(
                    parsedLines,
                    storeId,
                    documentId,
                    result.getId(),
                    supplierName
                );
                
                log.info("Saved {} line items with learned mappings applied", savedLines.size());
            } catch (Exception e) {
                log.error("Line item parsing failed (continuing without lines): {}", e.getMessage(), e);
                // Don't fail the whole parse if lines fail
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("Parse failed for documentId={}: {}", documentId, e.getMessage(), e);
            
            result.setParseStatus(InvoiceParseStatus.FAILED);
            result.setErrorMessage(e.getMessage());
            result.setCompletedAt(LocalDateTime.now());
            
            parseResultRepository.save(result);
            throw new RuntimeException("Parsing fehlgeschlagen: " + e.getMessage(), e);
        }
    }
    
    /**
     * SHA-256 Checksumme des Dokuments berechnen.
     */
    private String calculateChecksum(Long storeId, Long documentId) {
        try (InputStream input = documentService.getDocumentContent(documentId, storeId)) {
            byte[] fileBytes = input.readAllBytes();
            
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(fileBytes);
            
            return HexFormat.of().formatHex(hash);
            
        } catch (IOException | NoSuchAlgorithmException e) {
            log.error("Failed to calculate checksum for documentId={}: {}", documentId, e.getMessage());
            throw new RuntimeException("Checksumme konnte nicht berechnet werden", e);
        }
    }
    
    /**
     * Nicht-null Felder zählen für Logging.
     */
    private int countNonNullFields(ParsedInvoiceFields fields) {
        int count = 0;
        if (fields.supplierName() != null) count++;
        if (fields.invoiceNumber() != null) count++;
        if (fields.invoiceDate() != null) count++;
        if (fields.deliveryDate() != null) count++;
        if (fields.netAmount() != null) count++;
        if (fields.taxAmount() != null) count++;
        if (fields.grossAmount() != null) count++;
        if (fields.currency() != null) count++;
        return count;
    }
    
    /**
     * Gespeichertes Parse-Ergebnis abrufen (ohne OCR auszulösen).
     * 
     * @return Optional mit Ergebnis oder empty, wenn nichts vorhanden
     */
    public Optional<SupplierInvoiceParseResult> getParseResult(Long storeId, Long documentId) {
        log.debug("Loading cached parse result for documentId={}, storeId={}", documentId, storeId);
        return parseResultRepository.findByDocumentIdAndStoreId(documentId, storeId);
    }
    
    /**
     * Phase 3B-1B: Save parsed line items with learned product mappings.
     */
    private List<SupplierInvoiceLine> saveLineItems(
        List<ParsedInvoiceLine> parsedLines,
        Long storeId,
        Long documentId,
        Long parseResultId,
        String supplierName
    ) {
        List<SupplierInvoiceLine> savedLines = new ArrayList<>();
        
        for (ParsedInvoiceLine parsed : parsedLines) {
            SupplierInvoiceLine line = new SupplierInvoiceLine();
            line.setStoreId(storeId);
            line.setDocumentId(documentId);
            line.setParseResultId(parseResultId);
            line.setPositionNumber(parsed.positionNumber());
            line.setSupplierArticleNumber(parsed.supplierArticleNumber());
            line.setDescription(parsed.description());
            line.setQuantity(parsed.quantity());
            line.setUnit(parsed.unit());
            line.setPackagingUnit(parsed.packagingUnit());
            line.setUnitPrice(parsed.unitPrice());
            line.setLineTotal(parsed.lineTotal());
            line.setTaxRate(parsed.taxRate());
            line.setDiscount(parsed.discount());
            line.setConfidence(parsed.confidence());
            line.setRawText(parsed.rawText());
            
            // Serialize warnings as JSON
            if (parsed.warnings() != null && !parsed.warnings().isEmpty()) {
                try {
                    line.setWarningsJson(objectMapper.writeValueAsString(parsed.warnings()));
                } catch (JsonProcessingException e) {
                    log.warn("Failed to serialize warnings for line {}: {}", parsed.positionNumber(), e.getMessage());
                    line.setWarningsJson(null);
                }
            }
            
            // Set initial status based on confidence and warnings
            if (!parsed.warnings().isEmpty() || parsed.confidence() < 0.90) {
                line.setStatus(LineStatus.REVIEW_REQUIRED);
            } else {
                line.setStatus(LineStatus.UNREVIEWED);
            }
            
            // Apply learned product mappings
            if (supplierName != null) {
                productMappingService.applyLearnedMapping(line, supplierName);
            }
            
            SupplierInvoiceLine saved = lineRepository.save(line);
            savedLines.add(saved);
        }
        
        return savedLines;
    }
    
    /**
     * Phase 3B-1B: Load saved line items for a document.
     */
    public List<SupplierInvoiceLine> getLineItems(Long storeId, Long documentId) {
        return lineRepository.findByDocumentIdAndStoreIdOrderByPositionNumberAsc(documentId, storeId);
    }
}
