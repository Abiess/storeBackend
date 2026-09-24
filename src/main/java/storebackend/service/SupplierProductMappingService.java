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
            
            // Update product_id if provided
            if (productId != null) {
                if (mapping.getProductId() == null || !mapping.getProductId().equals(productId)) {
                    log.info("Updating product mapping: store={} supplier={} article={} → product={} (was: {})",
                        storeId, normalizedSupplier, trimmedArticle, productId, mapping.getProductId());
                    
                    mapping.setProductId(productId);
                    mapping.setConfirmationCount(1); // Reset count on change
                } else {
                    // Same product - increment confirmation
                    mapping.setConfirmationCount(mapping.getConfirmationCount() + 1);
                }
            } else {
                // productId is null - this shouldn't happen in createOrConfirmMapping
                // (should use learnMasterData instead), but handle gracefully
                log.debug("Confirming mapping without product change: store={} supplier={} article={}",
                    storeId, normalizedSupplier, trimmedArticle);
                mapping.setConfirmationCount(mapping.getConfirmationCount() + 1);
            }
            
            SupplierProductMapping saved = mappingRepository.save(mapping);
            log.info("Updated mapping: store={} supplier={} article={} → product={} (confirmations: {})",
                storeId, normalizedSupplier, trimmedArticle, saved.getProductId(), saved.getConfirmationCount());
            
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
     * Phase 3B-3: Also apply learned master data (description, unit, VPE, tax rate).
     * 
     * If mapping exists but product_id is null, only master data is applied.
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
            SupplierProductMapping m = mapping.get();
            
            // Apply product mapping only if product_id is not null
            if (m.getProductId() != null) {
                line.setMappingSource(MappingSource.LEARNED_MAPPING);
                line.setSuggestedProductId(m.getProductId());
                
                log.debug("Applied learned product mapping: article={} → product={}",
                    line.getSupplierArticleNumber(), m.getProductId());
            } else {
                // Master data learned, but no product assigned yet
                line.setMappingSource(MappingSource.NONE);
                line.setSuggestedProductId(null);
                
                log.debug("Applied learned master data (no product assignment): article={}",
                    line.getSupplierArticleNumber());
            }
            
            // Phase 3B-3: Apply learned master data as suggestions (regardless of product_id)
            if (m.getCorrectedDescription() != null && !m.getCorrectedDescription().trim().isEmpty()) {
                line.setDescription(m.getCorrectedDescription());
            }
            if (m.getDefaultUnit() != null && !m.getDefaultUnit().trim().isEmpty()) {
                line.setUnit(m.getDefaultUnit());
            }
            if (m.getDefaultPackagingUnit() != null) {
                line.setPackagingUnit(m.getDefaultPackagingUnit());
            }
            if (m.getDefaultTaxRate() != null) {
                line.setTaxRate(m.getDefaultTaxRate());
            }
            
            log.debug("Applied learned master data to line {}: desc={}, unit={}, vpe={}, tax={}",
                line.getPositionNumber(),
                m.getCorrectedDescription() != null ? m.getCorrectedDescription().substring(0, Math.min(20, m.getCorrectedDescription().length())) + "..." : null,
                m.getDefaultUnit(),
                m.getDefaultPackagingUnit(),
                m.getDefaultTaxRate());
        }
    }
    
    /**
     * Phase 3B-3: Learn master data from user correction.
     * Stores corrected description, default unit, VPE, tax rate, and product mapping.
     * Only transactional (quantity, prices, discount) are NOT learned.
     */
    @Transactional
    public void learnMasterData(
        Long storeId,
        String supplierName,
        String supplierArticleNumber,
        String correctedDescription,
        String defaultUnit,
        java.math.BigDecimal defaultPackagingUnit,
        java.math.BigDecimal defaultTaxRate,
        Long productId
    ) {
        if (supplierName == null || supplierArticleNumber == null) {
            log.warn("Cannot learn master data: missing supplier name or article number");
            return;
        }
        
        String normalizedSupplier = normalizer.normalize(supplierName);
        String trimmedArticle = supplierArticleNumber.trim();
        
        Optional<SupplierProductMapping> existing = mappingRepository
            .findByStoreIdAndNormalizedSupplierNameAndSupplierArticleNumberAndActiveTrue(
                storeId,
                normalizedSupplier,
                trimmedArticle
            );
        
        SupplierProductMapping mapping;
        
        if (existing.isPresent()) {
            mapping = existing.get();
            
            // Update product mapping if provided and different
            if (productId != null && !productId.equals(mapping.getProductId())) {
                mapping.setProductId(productId);
                mapping.setConfirmationCount(1); // Reset on product change
            } else if (productId != null) {
                mapping.setConfirmationCount(mapping.getConfirmationCount() + 1);
            }
        } else {
            // Create new mapping
            mapping = new SupplierProductMapping();
            mapping.setStoreId(storeId);
            mapping.setSupplierName(supplierName);
            mapping.setNormalizedSupplierName(normalizedSupplier);
            mapping.setSupplierArticleNumber(trimmedArticle);
            mapping.setConfirmationCount(1);
            mapping.setActive(true);
            
            if (productId != null) {
                mapping.setProductId(productId);
            }
        }
        
        // Update master data fields (Phase 3B-3)
        if (correctedDescription != null && !correctedDescription.trim().isEmpty()) {
            mapping.setCorrectedDescription(correctedDescription);
        }
        if (defaultUnit != null && !defaultUnit.trim().isEmpty()) {
            mapping.setDefaultUnit(defaultUnit);
        }
        if (defaultPackagingUnit != null) {
            mapping.setDefaultPackagingUnit(defaultPackagingUnit);
        }
        if (defaultTaxRate != null) {
            mapping.setDefaultTaxRate(defaultTaxRate);
        }
        
        mapping.setLastConfirmedAt(java.time.LocalDateTime.now());
        
        mappingRepository.save(mapping);
        
        log.info("Learned master data: store={} supplier={} article={} → desc={} unit={} vpe={} tax={} product={}",
            storeId, normalizedSupplier, trimmedArticle, 
            correctedDescription != null ? correctedDescription.substring(0, Math.min(30, correctedDescription.length())) + "..." : null,
            defaultUnit, defaultPackagingUnit, defaultTaxRate, productId);
    }
}
