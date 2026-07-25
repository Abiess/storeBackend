package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.SupplierFieldCorrection;
import storebackend.enums.SupplierCorrectionFieldType;
import storebackend.repository.SupplierFieldCorrectionRepository;

import java.util.Optional;

/**
 * Service for managing learned supplier field corrections (Phase 3A).
 * 
 * Responsibilities:
 * - Store user-confirmed field corrections
 * - Apply learned corrections during parsing
 * - Handle conflicting corrections (409 Conflict)
 * - Track confirmation counts
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierCorrectionService {
    
    private final SupplierFieldCorrectionRepository repository;
    private final SupplierCorrectionNormalizer normalizer;
    
    private static final int MAX_FIELD_LENGTH = 1000;
    
    /**
     * Confirm a supplier name correction.
     * 
     * Behavior:
     * - First confirmation: Create new mapping
     * - Same correction again: Increment confirmation_count
     * - Different correction: Return 409 Conflict (don't overwrite silently)
     * 
     * @param storeId Store ID (for tenant isolation)
     * @param rawValue Original value from OCR/parser
     * @param correctedValue User-confirmed correct value
     * @param supplierId Optional supplier ID (for future reference)
     * @param userId User who confirmed the correction
     * @return Saved correction
     * @throws IllegalArgumentException If values invalid
     * @throws ConflictingCorrectionException If conflicting correction exists
     */
    @Transactional
    public SupplierFieldCorrection confirmSupplierNameCorrection(
        Long storeId,
        String rawValue,
        String correctedValue,
        Long supplierId,
        Long userId
    ) {
        // Validation
        validateCorrectionInput(rawValue, correctedValue);
        
        // Normalize
        String normalizedRaw = normalizer.normalize(rawValue);
        String normalizedCorrected = normalizer.normalize(correctedValue);
        
        if (normalizedRaw.isEmpty() || normalizedCorrected.isEmpty()) {
            throw new IllegalArgumentException("Normalized values must not be empty");
        }
        
        // Check for existing correction
        Optional<SupplierFieldCorrection> existing = repository
            .findByStoreIdAndFieldTypeAndNormalizedRawValueAndActiveTrue(
                storeId,
                SupplierCorrectionFieldType.SUPPLIER_NAME,
                normalizedRaw
            );
        
        if (existing.isPresent()) {
            SupplierFieldCorrection correction = existing.get();
            
            // Same correction → increment count
            if (normalizedCorrected.equals(correction.getNormalizedCorrectedValue())) {
                correction.setConfirmationCount(correction.getConfirmationCount() + 1);
                correction = repository.save(correction);
                
                log.info("Incremented confirmation count for supplier correction: storeId={}, raw={}, count={}",
                    storeId, rawValue, correction.getConfirmationCount());
                
                return correction;
            }
            
            // Different correction → conflict!
            log.warn("Conflicting supplier correction: storeId={}, raw={}, existing={}, new={}",
                storeId, rawValue, correction.getCorrectedValue(), correctedValue);
            
            throw new ConflictingCorrectionException(
                "Conflicting correction exists: raw='" + rawValue +
                "', existing='" + correction.getCorrectedValue() +
                "', new='" + correctedValue + "'"
            );
        }
        
        // Create new correction
        SupplierFieldCorrection correction = new SupplierFieldCorrection();
        correction.setStoreId(storeId);
        correction.setSupplierId(supplierId);
        correction.setFieldType(SupplierCorrectionFieldType.SUPPLIER_NAME);
        correction.setRawValue(rawValue);
        correction.setNormalizedRawValue(normalizedRaw);
        correction.setCorrectedValue(correctedValue);
        correction.setNormalizedCorrectedValue(normalizedCorrected);
        correction.setConfirmationCount(1);
        correction.setActive(true);
        correction.setCreatedBy(userId);
        
        correction = repository.save(correction);
        
        log.info("Created new supplier correction: storeId={}, raw={}, corrected={}",
            storeId, rawValue, correctedValue);
        
        return correction;
    }
    
    /**
     * Find learned correction for a supplier name.
     * Used during parsing to apply corrections automatically.
     * 
     * @param storeId Store ID
     * @param rawValue Raw value from parser
     * @return Correction if found
     */
    public Optional<SupplierFieldCorrection> findSupplierNameCorrection(
        Long storeId,
        String rawValue
    ) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            return Optional.empty();
        }
        
        String normalized = normalizer.normalize(rawValue);
        
        return repository.findByStoreIdAndFieldTypeAndNormalizedRawValueAndActiveTrue(
            storeId,
            SupplierCorrectionFieldType.SUPPLIER_NAME,
            normalized
        );
    }
    
    /**
     * Validate correction input.
     */
    private void validateCorrectionInput(String rawValue, String correctedValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            throw new IllegalArgumentException("Raw value must not be empty");
        }
        
        if (correctedValue == null || correctedValue.trim().isEmpty()) {
            throw new IllegalArgumentException("Corrected value must not be empty");
        }
        
        if (rawValue.length() > MAX_FIELD_LENGTH) {
            throw new IllegalArgumentException("Raw value too long (max " + MAX_FIELD_LENGTH + " chars)");
        }
        
        if (correctedValue.length() > MAX_FIELD_LENGTH) {
            throw new IllegalArgumentException("Corrected value too long (max " + MAX_FIELD_LENGTH + " chars)");
        }
        
        // No HTML/script injection
        if (containsHtmlOrScript(rawValue) || containsHtmlOrScript(correctedValue)) {
            throw new IllegalArgumentException("HTML/script content not allowed");
        }
    }
    
    private boolean containsHtmlOrScript(String value) {
        String lower = value.toLowerCase();
        return lower.contains("<script") || 
               lower.contains("<iframe") || 
               lower.contains("javascript:") ||
               lower.contains("onerror=") ||
               lower.contains("onclick=");
    }
    
    /**
     * Exception for conflicting corrections.
     */
    public static class ConflictingCorrectionException extends RuntimeException {
        public ConflictingCorrectionException(String message) {
            super(message);
        }
    }
}
