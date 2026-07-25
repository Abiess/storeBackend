package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.SupplierProductMapping;
import storebackend.enums.LineStatus;
import storebackend.enums.MappingSource;
import storebackend.repository.SupplierInvoiceLineRepository;
import storebackend.repository.SupplierProductMappingRepository;

import java.util.Optional;

/**
 * Phase 3B-1B: Service for managing supplier product mappings (learned associations).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierProductMappingService {
    
    private final SupplierProductMappingRepository mappingRepository;
    private final SupplierInvoiceLineRepository lineRepository;
    private final SupplierCorrectionNormalizer normalizer;
    
    /**
     * Find existing mapping for supplier + article number.
     */
    public Optional<SupplierProductMapping> findMapping(
        Long storeId,
        String supplierName,
        String supplierArticleNumber
    ) {
        if (supplierName == null || supplierArticleNumber == null) {
            return Optional.empty();
        }
        
        String normalized = normalizer.normalize(supplierName);
        
        return mappingRepository.findByStoreIdAndNormalizedSupplierNameAndSupplierArticleNumberAndActiveTrue(
            storeId,
            normalized,
            supplierArticleNumber.trim()
        );
    }
    
    /**
     * Create or confirm a product mapping.
     * 
     * @param storeId Store ID
     * @param supplierName Supplier name (will be normalized)
     * @param supplierArticleNumber Supplier article number
     * @param productId Product to map to
     * @param rememberForFuture If true, creates/updates mapping for future use
     * @return Created or updated mapping (if rememberForFuture=true), empty otherwise
     */
    @Transactional
    public Optional<SupplierProductMapping> createOrConfirmMapping(
        Long storeId,
        String supplierName,
        String supplierArticleNumber,
        Long productId,
        Boolean rememberForFuture
    ) {
        if (!Boolean.TRUE.equals(rememberForFuture)) {
            log.debug("Mapping not saved (rememberForFuture=false)");
            return Optional.empty();
        }
        
        if (supplierName == null || supplierArticleNumber == null) {
            log.warn("Cannot create mapping: missing supplier name or article number");
            return Optional.empty();
        }
        
        String normalizedSupplier = normalizer.normalize(supplierName);
        String trimmedArticle = supplierArticleNumber.trim();
        
        Optional<SupplierProductMapping> existing = mappingRepository
            .findByStoreIdAndNormalizedSupplierNameAndSupplierArticleNumberAndActiveTrue(
                storeId,
                normalizedSupplier,
                trimmedArticle
            );
        
        if (existing.isPresent()) {
            SupplierProductMapping mapping = existing.get();
            
            if (!mapping.getProductId().equals(productId)) {
                log.warn("Mapping conflict: store={} supplier={} article={} currently maps to product={}, new request for product={}",
                    storeId, normalizedSupplier, trimmedArticle, mapping.getProductId(), productId);
                
                // User is changing the mapping - update it
                mapping.setProductId(productId);
                mapping.setConfirmationCount(1); // Reset count on change
            } else {
                // Same mapping - increment confirmation
                mapping.setConfirmationCount(mapping.getConfirmationCount() + 1);
            }
            
            SupplierProductMapping saved = mappingRepository.save(mapping);
            log.info("Updated mapping: store={} supplier={} article={} → product={} (confirmations: {})",
                storeId, normalizedSupplier, trimmedArticle, productId, saved.getConfirmationCount());
            
            return Optional.of(saved);
        } else {
            // Create new mapping
            SupplierProductMapping mapping = new SupplierProductMapping();
            mapping.setStoreId(storeId);
            mapping.setSupplierName(supplierName);
            mapping.setNormalizedSupplierName(normalizedSupplier);
            mapping.setSupplierArticleNumber(trimmedArticle);
            mapping.setProductId(productId);
            mapping.setConfirmationCount(1);
            mapping.setActive(true);
            
            SupplierProductMapping saved = mappingRepository.save(mapping);
            log.info("Created new mapping: store={} supplier={} article={} → product={}",
                storeId, normalizedSupplier, trimmedArticle, productId);
            
            return Optional.of(saved);
        }
    }
    
    /**
     * Apply learned mappings to a line (suggest product based on supplier + article number).
     */
    public void applyLearnedMapping(storebackend.entity.SupplierInvoiceLine line, String supplierName) {
        if (line.getSupplierArticleNumber() == null || supplierName == null) {
            return;
        }
        
        Optional<SupplierProductMapping> mapping = findMapping(
            line.getStoreId(),
            supplierName,
            line.getSupplierArticleNumber()
        );
        
        if (mapping.isPresent()) {
            line.setMappingSource(MappingSource.LEARNED_MAPPING);
            line.setSuggestedProductId(mapping.get().getProductId());
            log.debug("Applied learned mapping to line {}: article={} → product={}",
                line.getPositionNumber(),
                line.getSupplierArticleNumber(),
                mapping.get().getProductId());
        }
    }
}
