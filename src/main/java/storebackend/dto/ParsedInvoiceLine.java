package storebackend.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Phase 3B-1: Parsed invoice line item from OCR table extraction.
 * 
 * @param positionNumber Position number in invoice (1, 2, 3, ...)
 * @param supplierArticleNumber Supplier's article number (A-Nr)
 * @param description Product description
 * @param quantity Ordered quantity
 * @param unit Unit (Kolli, Kilo, Stück, etc.)
 * @param packagingUnit Packaging unit / VPE (items per package)
 * @param unitPrice Price per unit (E-Preis)
 * @param lineTotal Total line amount (GPreis)
 * @param taxRate VAT rate (7, 19)
 * @param discount Discount percentage
 * @param confidence Parser confidence (0.0-1.0)
 * @param rawText Raw OCR text for this line
 * @param warnings Validation warnings
 */
public record ParsedInvoiceLine(
    Integer positionNumber,
    String supplierArticleNumber,
    String description,
    BigDecimal quantity,
    String unit,
    BigDecimal packagingUnit,
    BigDecimal unitPrice,
    BigDecimal lineTotal,
    BigDecimal taxRate,
    BigDecimal discount,
    Double confidence,
    String rawText,
    List<String> warnings
) {
    public ParsedInvoiceLine {
        // Ensure non-null collections
        if (warnings == null) {
            warnings = List.of();
        }
    }
}
