package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.*;
import storebackend.entity.*;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Phase 4A: Supplier Invoice Import Preview Service.
 * 
 * Generiert Vorschau für Rechnungsimport OHNE Daten zu ändern.
 * Zeigt:
 * - Neue Produkte (brauchen Kategorie + Verkaufspreis)
 * - Bestehende Produkte (Bestandsupdate)
 * - Positionen die Entscheidung brauchen
 * - Bereits importierte Positionen
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierInvoiceImportService {
    
    private final SupplierInvoiceParseResultRepository parseResultRepository;
    private final SupplierInvoiceLineRepository lineRepository;
    private final SupplierInvoiceLineImportRepository importLogRepository;
    private final SupplierProductMappingRepository mappingRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final SupplierInvoiceDocumentRepository documentRepository;
    
    /**
     * Generiert Import-Vorschau für ein Dokument.
     * KEINE Datenänderung!
     */
    @Transactional(readOnly = true)
    public SupplierInvoiceImportPreviewResponse generatePreview(Long storeId, Long documentId) {
        log.info("[InvoiceImportPreview] Generating preview for store={}, document={}", storeId, documentId);
        
        // Security: Prüfe Store-Zugehörigkeit
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found"));
        
        SupplierInvoiceDocument doc = documentRepository.findByIdAndStoreId(documentId, storeId)
            .orElseThrow(() -> new RuntimeException("Document not found or access denied"));
        
        // Lade Parse-Result für Supplier-Name und Invoice-Number
        Optional<SupplierInvoiceParseResult> parseResult = 
            parseResultRepository.findByDocumentIdAndStoreId(documentId, storeId);
        
        String supplierName = parseResult.map(SupplierInvoiceParseResult::getSupplierName).orElse(null);
        String invoiceNumber = parseResult.map(SupplierInvoiceParseResult::getInvoiceNumber).orElse(null);
        
        // Lade alle Lines
        List<SupplierInvoiceLine> allLines = lineRepository.findByDocumentIdAndStoreIdOrderByPositionNumberAsc(documentId, storeId);
        
        SupplierInvoiceImportPreviewResponse response = SupplierInvoiceImportPreviewResponse.builder()
            .documentId(documentId)
            .supplierName(supplierName)
            .invoiceNumber(invoiceNumber)
            .build();
        
        int totalLines = allLines.size();
        int readyToCreate = 0;
        int readyToUpdate = 0;
        int needsDecision = 0;
        int skipped = 0;
        int alreadyImported = 0;
        
        for (SupplierInvoiceLine line : allLines) {
            // 1. Bereits importiert?
            if (importLogRepository.existsByDocumentIdAndLineId(documentId, line.getId())) {
                Optional<SupplierInvoiceLineImport> importLog = 
                    importLogRepository.findByDocumentIdAndLineId(documentId, line.getId());
                response.getSkippedLines().add(LineSkipped.builder()
                    .lineId(line.getId())
                    .supplierArticleNumber(line.getSupplierArticleNumber())
                    .description(line.getDescription())
                    .reason("ALREADY_IMPORTED")
                    .reasonMessage("Position bereits importiert")
                    .importedAt(importLog.map(SupplierInvoiceLineImport::getImportedAt).orElse(null))
                    .build());
                skipped++;
                alreadyImported++;
                continue;
            }
            
            // 2. Status prüfen: nur CONFIRMED oder MAPPED
            if (!"CONFIRMED".equals(line.getStatus()) && !"MAPPED".equals(line.getStatus())) {
                response.getNeedsDecision().add(LineNeedsDecision.builder()
                    .lineId(line.getId())
                    .supplierArticleNumber(line.getSupplierArticleNumber())
                    .description(line.getDescription())
                    .reason("LINE_NOT_REVIEWED")
                    .reasonMessage("Position muss erst geprüft werden")
                    .build());
                needsDecision++;
                continue;
            }
            
            // 3. Matching-Reihenfolge
            MatchResult match = findMatchingProduct(line, storeId, supplierName);
            
            if (match.productId != null) {
                // Bestehendes Produkt
                Optional<Product> product = productRepository.findById(match.productId);
                if (product.isPresent() && product.get().getStore().getId().equals(storeId)) {
                    Product p = product.get();
                    Integer quantityToAdd = calculateStockQuantity(line);
                    
                    ProductToUpdate update = ProductToUpdate.builder()
                        .lineId(line.getId())
                        .supplierArticleNumber(line.getSupplierArticleNumber())
                        .invoiceDescription(line.getDescription())
                        .productId(p.getId())
                        .productTitle(p.getTitle())
                        .matchReason(match.matchReason)
                        .currentStock(p.getStock() != null ? p.getStock() : 0)
                        .quantityToAdd(quantityToAdd)
                        .newStock(quantityToAdd != null ? (p.getStock() != null ? p.getStock() : 0) + quantityToAdd : null)
                        .currentPurchasePrice(null) // Product hat kein purchasePrice-Feld
                        .invoicePurchasePrice(line.getUnitPrice())
                        .canImport(quantityToAdd != null)
                        .build();
                    
                    if (quantityToAdd == null) {
                        update.getWarnings().add("STOCK_QUANTITY_CONFIRMATION_REQUIRED");
                    }
                    
                    response.getExistingProducts().add(update);
                    readyToUpdate++;
                } else {
                    // Produkt existiert nicht oder gehört anderem Store
                    response.getNeedsDecision().add(LineNeedsDecision.builder()
                        .lineId(line.getId())
                        .supplierArticleNumber(line.getSupplierArticleNumber())
                        .description(line.getDescription())
                        .reason("PRODUCT_NOT_FOUND")
                        .reasonMessage("Gematchtes Produkt nicht gefunden")
                        .build());
                    needsDecision++;
                }
            } else {
                // Neues Produkt
                Integer quantityToAdd = calculateStockQuantity(line);
                
                ProductToCreate create = ProductToCreate.builder()
                    .lineId(line.getId())
                    .supplierArticleNumber(line.getSupplierArticleNumber())
                    .suggestedTitle(line.getDescription())
                    .description(line.getDescription())
                    .purchasePrice(line.getUnitPrice())
                    .taxRate(line.getTaxRate())
                    .unit(line.getUnit())
                    .packagingUnit(line.getPackagingUnit())
                    .quantityToAdd(quantityToAdd)
                    .canImport(false) // braucht Kategorie + Verkaufspreis
                    .build();
                
                create.getRequiredInputs().add("CATEGORY");
                create.getRequiredInputs().add("SELLING_PRICE");
                
                if (quantityToAdd == null) {
                    create.getWarnings().add("STOCK_QUANTITY_CONFIRMATION_REQUIRED");
                }
                
                response.getNewProducts().add(create);
                readyToCreate++;
            }
        }
        
        response.setSummary(ImportSummary.builder()
            .totalLines(totalLines)
            .readyToCreate(readyToCreate)
            .readyToUpdate(readyToUpdate)
            .needsDecision(needsDecision)
            .skipped(skipped)
            .alreadyImported(alreadyImported)
            .build());
        
        log.info("[InvoiceImportPreview] Preview generated: totalLines={}, create={}, update={}, needsDecision={}, skipped={}",
            totalLines, readyToCreate, readyToUpdate, needsDecision, skipped);
        
        return response;
    }
    
    /**
     * Findet gematchtes Produkt in folgender Reihenfolge:
     * 1. suggestedProductId
     * 2. SupplierProductMapping (gelernt)
     * 3. SKU-Match
     */
    private MatchResult findMatchingProduct(SupplierInvoiceLine line, Long storeId, String supplierName) {
        // 1. User-Zuordnung
        if (line.getSuggestedProductId() != null) {
            return new MatchResult(line.getSuggestedProductId(), "USER_ASSIGNED");
        }
        
        // 2. Gelerntes Mapping
        if (supplierName != null && line.getSupplierArticleNumber() != null) {
            String normalizedSupplier = normalize(supplierName);
            Optional<SupplierProductMapping> mapping = mappingRepository
                .findByStoreIdAndNormalizedSupplierNameAndSupplierArticleNumberAndActiveTrue(
                    storeId, normalizedSupplier, line.getSupplierArticleNumber().trim());
            
            if (mapping.isPresent() && mapping.get().getProductId() != null) {
                return new MatchResult(mapping.get().getProductId(), "LEARNED_MAPPING");
            }
        }
        
        // 3. SKU-Match
        if (line.getSupplierArticleNumber() != null && !line.getSupplierArticleNumber().isBlank()) {
            Optional<Product> product = productRepository.findByStoreIdAndSku(storeId, line.getSupplierArticleNumber().trim());
            if (product.isPresent()) {
                return new MatchResult(product.get().getId(), "SKU_MATCH");
            }
        }
        
        return new MatchResult(null, null);
    }
    
    /**
     * Berechnet Bestandszugang: quantity × packagingUnit.
     * Nur wenn sinnvoll automatisch berechenbar (nicht bei Kg, Liter, etc.)
     */
    private Integer calculateStockQuantity(SupplierInvoiceLine line) {
        if (line.getQuantity() == null || line.getPackagingUnit() == null) {
            return null;
        }
        
        String unit = line.getUnit() != null ? line.getUnit().trim().toLowerCase() : "";
        
        // Nicht automatisch berechnen bei Gewicht/Volumen
        if (unit.matches(".*(kg|kilo|liter|l|ml).*")) {
            return null;
        }
        
        // Nur bei Kolli, Karton, Stk etc.
        if (unit.matches(".*(kolli|karton|stk|stück|piece|box).*") || unit.isEmpty()) {
            try {
                int qty = line.getQuantity().intValue();
                int vpe = line.getPackagingUnit().intValue();
                return qty * vpe;
            } catch (Exception e) {
                return null;
            }
        }
        
        return null;
    }
    
    private String normalize(String text) {
        if (text == null) return "";
        return text.trim().toLowerCase()
            .replaceAll("\\s+", " ")
            .replaceAll("[^a-z0-9äöüß ]", "");
    }
    
    private static class MatchResult {
        Long productId;
        String matchReason;
        
        MatchResult(Long productId, String matchReason) {
            this.productId = productId;
            this.matchReason = matchReason;
        }
    }
}
