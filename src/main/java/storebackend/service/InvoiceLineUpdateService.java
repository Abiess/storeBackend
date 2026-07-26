package storebackend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateLineRequest;
import storebackend.dto.ProductMappingRequest;
import storebackend.dto.UpdateLineRequest;
import storebackend.entity.Product;
import storebackend.entity.SupplierInvoiceLine;
import storebackend.entity.SupplierInvoiceParseResult;
import storebackend.enums.LineStatus;
import storebackend.enums.MappingSource;
import storebackend.repository.ProductRepository;
import storebackend.repository.SupplierInvoiceLineRepository;
import storebackend.repository.SupplierInvoiceParseResultRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Phase 3B-1B: Service for updating invoice lines (corrections, mappings, bulk operations).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceLineUpdateService {
    
    private final SupplierInvoiceLineRepository lineRepository;
    private final SupplierInvoiceParseResultRepository parseResultRepository;
    private final ProductRepository productRepository;
    private final SupplierProductMappingService productMappingService;
    private final ObjectMapper objectMapper;
    
    /**
     * Update a line with user corrections.
     */
    @Transactional
    public SupplierInvoiceLine updateLine(Long storeId, Long documentId, Long lineId, UpdateLineRequest request) {
        // Security: Load and verify ownership
        SupplierInvoiceLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        
        if (!line.getStoreId().equals(storeId)) {
            throw new SecurityException("Line does not belong to store " + storeId);
        }
        
        if (!line.getDocumentId().equals(documentId)) {
            throw new IllegalArgumentException("Line does not belong to document " + documentId);
        }
        
        // Update fields
        if (request.getSupplierArticleNumber() != null) {
            line.setSupplierArticleNumber(request.getSupplierArticleNumber());
        }
        if (request.getDescription() != null) {
            line.setDescription(request.getDescription());
        }
        if (request.getQuantity() != null) {
            line.setQuantity(request.getQuantity());
        }
        if (request.getUnit() != null) {
            line.setUnit(request.getUnit());
        }
        if (request.getPackagingUnit() != null) {
            line.setPackagingUnit(request.getPackagingUnit());
        }
        if (request.getUnitPrice() != null) {
            line.setUnitPrice(request.getUnitPrice());
        }
        if (request.getLineTotal() != null) {
            line.setLineTotal(request.getLineTotal());
        }
        if (request.getTaxRate() != null) {
            line.setTaxRate(request.getTaxRate());
        }
        if (request.getDiscount() != null) {
            line.setDiscount(request.getDiscount());
        }
        
        // Mark as user-corrected and confirmed
        line.setUserCorrected(true);
        
        // Only set to CONFIRMED if not already MAPPED
        if (line.getStatus() != LineStatus.MAPPED) {
            line.setStatus(LineStatus.CONFIRMED);
        }
        
        // Recalculate plausibility and warnings
        recalculateWarnings(line);
        
        return lineRepository.save(line);
    }
    
    /**
     * Map a line to a product.
     */
    @Transactional
    public SupplierInvoiceLine mapToProduct(Long storeId, Long documentId, Long lineId, ProductMappingRequest request) {
        // Security: Load and verify ownership
        SupplierInvoiceLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        
        if (!line.getStoreId().equals(storeId)) {
            throw new SecurityException("Line does not belong to store " + storeId);
        }
        
        if (!line.getDocumentId().equals(documentId)) {
            throw new IllegalArgumentException("Line does not belong to document " + documentId);
        }
        
        // Verify product belongs to same store
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.getProductId()));
        
        if (product.getStore() == null || !product.getStore().getId().equals(storeId)) {
            throw new SecurityException("Product does not belong to store " + storeId);
        }
        
        // Get supplier name from parse result
        String supplierName = null;
        Optional<SupplierInvoiceParseResult> parseResult = 
            parseResultRepository.findByDocumentIdAndStoreId(documentId, storeId);
        if (parseResult.isPresent()) {
            supplierName = parseResult.get().getSupplierName();
        }
        
        // Create or confirm mapping if rememberForFuture=true
        if (Boolean.TRUE.equals(request.getRememberForFuture()) && supplierName != null) {
            productMappingService.createOrConfirmMapping(
                storeId,
                supplierName,
                line.getSupplierArticleNumber(),
                product.getId(),
                true
            );
            log.info("Created/confirmed product mapping: store={} supplier={} article={} → product={}",
                storeId, supplierName, line.getSupplierArticleNumber(), product.getId());
        }
        
        // Update line
        line.setSuggestedProductId(product.getId());
        line.setMappingSource(MappingSource.USER_ASSIGNED);
        line.setStatus(LineStatus.MAPPED);
        
        return lineRepository.save(line);
    }
    
    /**
     * Bulk confirm lines (set status to CONFIRMED).
     */
    @Transactional
    public BulkConfirmResult bulkConfirm(Long storeId, Long documentId, List<Long> lineIds, boolean onlyWithoutWarnings) {
        int requested = lineIds.size();
        int confirmed = 0;
        int skipped = 0;
        
        for (Long lineId : lineIds) {
            Optional<SupplierInvoiceLine> lineOpt = lineRepository.findById(lineId);
            
            if (lineOpt.isEmpty()) {
                log.warn("Line not found: {}", lineId);
                skipped++;
                continue;
            }
            
            SupplierInvoiceLine line = lineOpt.get();
            
            // Security checks
            if (!line.getStoreId().equals(storeId) || !line.getDocumentId().equals(documentId)) {
                log.warn("Line {} does not belong to store {} or document {}", lineId, storeId, documentId);
                skipped++;
                continue;
            }
            
            // Skip if onlyWithoutWarnings and line has warnings
            if (onlyWithoutWarnings && line.getWarningsJson() != null && !line.getWarningsJson().isEmpty()) {
                try {
                    List<?> warnings = objectMapper.readValue(line.getWarningsJson(), List.class);
                    if (!warnings.isEmpty()) {
                        log.debug("Skipping line {} with warnings", lineId);
                        skipped++;
                        continue;
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse warnings for line {}: {}", lineId, e.getMessage());
                }
            }
            
            // Don't change MAPPED status
            if (line.getStatus() == LineStatus.MAPPED) {
                log.debug("Line {} already mapped, keeping status", lineId);
                confirmed++;
                continue;
            }
            
            // Confirm the line
            line.setStatus(LineStatus.CONFIRMED);
            lineRepository.save(line);
            confirmed++;
        }
        
        return new BulkConfirmResult(requested, confirmed, skipped);
    }
    
    /**
     * Recalculate warnings based on plausibility check.
     */
    private void recalculateWarnings(SupplierInvoiceLine line) {
        List<String> warnings = new ArrayList<>();
        
        // Plausibility: quantity × packagingUnit × unitPrice ≈ lineTotal
        if (line.getQuantity() != null && line.getPackagingUnit() != null && 
            line.getUnitPrice() != null && line.getLineTotal() != null) {
            
            BigDecimal calculated = line.getQuantity()
                    .multiply(line.getPackagingUnit())
                    .multiply(line.getUnitPrice());
            
            BigDecimal diff = line.getLineTotal().subtract(calculated).abs();
            BigDecimal tolerance = new BigDecimal("0.03");
            
            if (diff.compareTo(tolerance) > 0) {
                warnings.add(String.format("Line total mismatch: expected %.2f, got %.2f (diff: %.2f)",
                        calculated, line.getLineTotal(), diff));
            }
        }
        
        // Serialize warnings
        if (!warnings.isEmpty()) {
            try {
                line.setWarningsJson(objectMapper.writeValueAsString(warnings));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize warnings: {}", e.getMessage());
            }
        } else {
            line.setWarningsJson(null);
        }
        
        // Update confidence
        if (warnings.isEmpty()) {
            line.setConfidence(0.95);
        } else {
            line.setConfidence(0.75);
        }
    }
    
    /**
     * Result of bulk confirm operation.
     */
    public static class BulkConfirmResult {
        public final int requested;
        public final int confirmed;
        public final int skipped;
        
        public BulkConfirmResult(int requested, int confirmed, int skipped) {
            this.requested = requested;
            this.confirmed = confirmed;
            this.skipped = skipped;
        }
    }
    
    /**
     * Phase 3B-2: Manually create a new invoice line.
     */
    @Transactional
    public SupplierInvoiceLine createLine(Long storeId, Long documentId, CreateLineRequest request) {
        // Security: Verify document belongs to store
        Optional<SupplierInvoiceParseResult> parseResult = 
            parseResultRepository.findByDocumentIdAndStoreId(documentId, storeId);
        if (parseResult.isEmpty()) {
            throw new IllegalArgumentException("Document not found or does not belong to store");
        }
        
        // Get highest position number
        List<SupplierInvoiceLine> existingLines = lineRepository.findByDocumentIdAndStoreIdOrderByPositionNumberAsc(documentId, storeId);
        int newPositionNumber = existingLines.stream()
            .map(SupplierInvoiceLine::getPositionNumber)
            .max(Comparator.naturalOrder())
            .orElse(0) + 1;
        
        // Create new line
        SupplierInvoiceLine line = new SupplierInvoiceLine();
        line.setStoreId(storeId);
        line.setDocumentId(documentId);
        line.setPositionNumber(newPositionNumber);
        line.setSupplierArticleNumber(request.getSupplierArticleNumber());
        line.setDescription(request.getDescription());
        line.setQuantity(request.getQuantity());
        line.setUnit(request.getUnit());
        line.setPackagingUnit(request.getPackagingUnit());
        line.setUnitPrice(request.getUnitPrice());
        line.setLineTotal(request.getLineTotal());
        line.setTaxRate(request.getTaxRate());
        line.setDiscount(BigDecimal.ZERO);
        line.setConfidence(1.0); // Manually created, no OCR uncertainty
        line.setUserCorrected(true);
        line.setStatus(LineStatus.CONFIRMED);
        line.setRawText("Manually created by user");
        line.setWarningsJson(null);
        
        return lineRepository.save(line);
    }
    
    /**
     * Phase 3B-2: Delete an invoice line.
     */
    @Transactional
    public void deleteLine(Long storeId, Long documentId, Long lineId) {
        // Security: Load and verify ownership
        SupplierInvoiceLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        
        if (!line.getStoreId().equals(storeId)) {
            throw new SecurityException("Line does not belong to store " + storeId);
        }
        
        if (!line.getDocumentId().equals(documentId)) {
            throw new IllegalArgumentException("Line does not belong to document " + documentId);
        }
        
        // Soft delete or hard delete (hard delete for now - only deletes invoice line, not store product)
        lineRepository.delete(line);
        log.info("Deleted invoice line: storeId={}, documentId={}, lineId={}", storeId, documentId, lineId);
    }
    
    /**
     * Phase 3B-2: Split a line at text position.
     */
    @Transactional
    public List<SupplierInvoiceLine> splitLine(Long storeId, Long documentId, Long lineId, Integer splitPosition) {
        // Security: Load and verify ownership
        SupplierInvoiceLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        
        if (!line.getStoreId().equals(storeId)) {
            throw new SecurityException("Line does not belong to store " + storeId);
        }
        
        if (!line.getDocumentId().equals(documentId)) {
            throw new IllegalArgumentException("Line does not belong to document " + documentId);
        }
        
        String description = line.getDescription();
        if (description == null || splitPosition < 0 || splitPosition >= description.length()) {
            throw new IllegalArgumentException("Invalid split position: " + splitPosition);
        }
        
        // Split description
        String part1 = description.substring(0, splitPosition).trim();
        String part2 = description.substring(splitPosition).trim();
        
        if (part1.isEmpty() || part2.isEmpty()) {
            throw new IllegalArgumentException("Split would result in empty description");
        }
        
        // Update original line (Part A)
        line.setDescription(part1);
        line.setLineTotal(null); // Reset numeric values - user must re-enter
        line.setQuantity(null);
        line.setUnitPrice(null);
        line.setStatus(LineStatus.REVIEW_REQUIRED);
        line.setUserCorrected(true);
        lineRepository.save(line);
        
        // Create new line (Part B)
        SupplierInvoiceLine newLine = new SupplierInvoiceLine();
        newLine.setStoreId(storeId);
        newLine.setDocumentId(documentId);
        newLine.setPositionNumber(line.getPositionNumber() + 1); // Insert after original
        newLine.setSupplierArticleNumber(null); // User must enter
        newLine.setDescription(part2);
        newLine.setQuantity(null);
        newLine.setUnit(line.getUnit());
        newLine.setPackagingUnit(null);
        newLine.setUnitPrice(null);
        newLine.setLineTotal(null);
        newLine.setTaxRate(line.getTaxRate());
        newLine.setDiscount(BigDecimal.ZERO);
        newLine.setConfidence(0.5);
        newLine.setUserCorrected(true);
        newLine.setStatus(LineStatus.REVIEW_REQUIRED);
        newLine.setRawText("Split from line " + lineId);
        newLine.setWarningsJson(null);
        lineRepository.save(newLine);
        
        // Renumber subsequent lines
        renumberLinesAfter(storeId, documentId, line.getPositionNumber());
        
        return List.of(line, newLine);
    }
    
    /**
     * Phase 3B-2: Merge line with next line.
     */
    @Transactional
    public SupplierInvoiceLine mergeWithNext(Long storeId, Long documentId, Long lineId) {
        // Security: Load and verify ownership
        SupplierInvoiceLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        
        if (!line.getStoreId().equals(storeId)) {
            throw new SecurityException("Line does not belong to store " + storeId);
        }
        
        if (!line.getDocumentId().equals(documentId)) {
            throw new IllegalArgumentException("Line does not belong to document " + documentId);
        }
        
        // Find next line by position number
        List<SupplierInvoiceLine> allLines = lineRepository.findByDocumentIdAndStoreIdOrderByPositionNumberAsc(documentId, storeId);
        SupplierInvoiceLine nextLine = null;
        for (int i = 0; i < allLines.size() - 1; i++) {
            if (allLines.get(i).getId().equals(lineId)) {
                nextLine = allLines.get(i + 1);
                break;
            }
        }
        
        if (nextLine == null) {
            throw new IllegalArgumentException("No next line to merge with");
        }
        
        // Merge descriptions
        String mergedDescription = line.getDescription() + " " + nextLine.getDescription();
        line.setDescription(mergedDescription);
        line.setUserCorrected(true);
        line.setStatus(LineStatus.REVIEW_REQUIRED); // User must verify
        
        // Keep first line's numeric values, discard second
        lineRepository.save(line);
        
        // Delete next line
        lineRepository.delete(nextLine);
        
        // Renumber subsequent lines
        renumberLinesAfter(storeId, documentId, line.getPositionNumber());
        
        log.info("Merged lines: {} + {} → {}", lineId, nextLine.getId(), line.getId());
        return line;
    }
    
    /**
     * Renumber lines after insertion/deletion.
     */
    private void renumberLinesAfter(Long storeId, Long documentId, Integer startPosition) {
        List<SupplierInvoiceLine> lines = lineRepository.findByDocumentIdAndStoreIdOrderByPositionNumberAsc(documentId, storeId);
        int nextNumber = startPosition + 1;
        
        for (SupplierInvoiceLine l : lines) {
            if (l.getPositionNumber() > startPosition) {
                l.setPositionNumber(nextNumber++);
                lineRepository.save(l);
            }
        }
    }
}