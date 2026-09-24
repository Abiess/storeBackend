package storebackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.dto.InvoiceLineDTO;
import storebackend.dto.LineSummaryDTO;
import storebackend.entity.SupplierInvoiceLine;
import storebackend.enums.LineStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Phase 3B-1B: Service for converting entities to DTOs and calculating summaries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceLineDTOMapper {
    
    private final ObjectMapper objectMapper;
    
    /**
     * Convert entity to DTO.
     */
    public InvoiceLineDTO toDTO(SupplierInvoiceLine line) {
        InvoiceLineDTO dto = new InvoiceLineDTO();
        dto.setId(line.getId());
        dto.setPositionNumber(line.getPositionNumber());
        dto.setSupplierArticleNumber(line.getSupplierArticleNumber());
        dto.setDescription(line.getDescription());
        dto.setQuantity(line.getQuantity());
        dto.setUnit(line.getUnit());
        dto.setPackagingUnit(line.getPackagingUnit());
        dto.setUnitPrice(line.getUnitPrice());
        dto.setLineTotal(line.getLineTotal());
        dto.setTaxRate(line.getTaxRate());
        dto.setDiscount(line.getDiscount());
        dto.setConfidence(line.getConfidence());
        dto.setStatus(line.getStatus());
        dto.setMappingSource(line.getMappingSource());
        dto.setSuggestedProductId(line.getSuggestedProductId());
        dto.setUserCorrected(line.getUserCorrected());
        
        // Deserialize warnings
        if (line.getWarningsJson() != null && !line.getWarningsJson().isEmpty()) {
            try {
                dto.setWarnings(objectMapper.readValue(line.getWarningsJson(), new TypeReference<List<String>>() {}));
            } catch (Exception e) {
                log.warn("Failed to deserialize warnings for line {}: {}", line.getId(), e.getMessage());
                dto.setWarnings(List.of());
            }
        } else {
            dto.setWarnings(List.of());
        }
        
        return dto;
    }
    
    /**
     * Convert list of entities to DTOs.
     */
    public List<InvoiceLineDTO> toDTOList(List<SupplierInvoiceLine> lines) {
        return lines.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Calculate summary statistics for lines.
     */
    public LineSummaryDTO calculateSummary(List<SupplierInvoiceLine> lines) {
        int detected = lines.size();
        
        long confirmed = lines.stream()
                .filter(line -> line.getStatus() == LineStatus.CONFIRMED)
                .count();
        
        long mapped = lines.stream()
                .filter(line -> line.getStatus() == LineStatus.MAPPED)
                .count();
        
        long needsReview = lines.stream()
                .filter(line -> line.getStatus() == LineStatus.UNREVIEWED || 
                               line.getStatus() == LineStatus.REVIEW_REQUIRED)
                .count();
        
        return new LineSummaryDTO(detected, (int)confirmed, (int)mapped, (int)needsReview);
    }
    
    /**
     * Calculate stock quantity if unit is piece-based.
     * Returns null for weight/volume units.
     */
    public BigDecimal calculateStockQuantity(BigDecimal quantity, BigDecimal packagingUnit, String unit) {
        if (quantity == null || packagingUnit == null || unit == null) {
            return null;
        }
        
        // Only calculate for piece-based units
        String normalizedUnit = unit.trim().toLowerCase();
        boolean isPieceBased = normalizedUnit.equals("kolli") || 
                              normalizedUnit.equals("stück") || 
                              normalizedUnit.equals("stk") ||
                              normalizedUnit.equals("karton") ||
                              normalizedUnit.equals("pack");
        
        if (!isPieceBased) {
            return null;
        }
        
        try {
            return quantity.multiply(packagingUnit);
        } catch (Exception e) {
            log.warn("Failed to calculate stock quantity: quantity={}, vpe={}", quantity, packagingUnit);
            return null;
        }
    }
}
