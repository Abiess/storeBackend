package storebackend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import storebackend.enums.SupplierType;

import java.math.BigDecimal;

/**
 * DTO für Dropshipping Source (Supplier Link + Einkaufspreis)
 */
@Schema(description = "Dropshipping supplier link and purchase information")
public record DropshippingSourceDTO(
        @Schema(description = "Dropshipping source ID", example = "1")
        Long id,

        @Schema(description = "Product variant ID", example = "42")
        Long variantId,

        @Schema(description = "Supplier type", example = "MANUAL")
        SupplierType supplierType,

        @Schema(description = "Supplier product URL", example = "https://www.alibaba.com/product/123456")
        String supplierUrl,

        @Schema(description = "Supplier name", example = "Alibaba - Fashion Supplier Co.")
        String supplierName,

        @Schema(description = "Purchase price from supplier", example = "8.50")
        BigDecimal purchasePrice,

        @Schema(description = "Estimated shipping time in days", example = "14")
        Integer estimatedShippingDays,

        @Schema(description = "Supplier's SKU (if different)", example = "SUPPLIER-SKU-123")
        String supplierSku,

        @Schema(description = "CJ Product ID (for API integration)", example = "CJ-PROD-12345")
        String cjProductId,

        @Schema(description = "CJ Variant ID (for API integration)", example = "CJ-VAR-67890")
        String cjVariantId,

        @Schema(description = "Internal notes", example = "MOQ: 10 pieces, Payment: PayPal")
        String notes,

        // Calculated fields (not stored)
        @Schema(description = "Sale price of variant", example = "19.99")
        BigDecimal salePrice,

        @Schema(description = "Profit margin percentage", example = "0.57")
        BigDecimal marginPercentage,

        @Schema(description = "Absolute profit amount", example = "11.49")
        BigDecimal profitAmount
) {
    /**
     * Constructor für Create/Update ohne berechnete Felder
     */
    public DropshippingSourceDTO(Long id, Long variantId, SupplierType supplierType, String supplierUrl,
                                  String supplierName, BigDecimal purchasePrice, Integer estimatedShippingDays,
                                  String supplierSku, String cjProductId, String cjVariantId, String notes) {
        this(id, variantId, supplierType, supplierUrl, supplierName, purchasePrice,
             estimatedShippingDays, supplierSku, cjProductId, cjVariantId, notes,
             null, null, null);
    }

    /**
     * Berechnet Marge basierend auf Verkaufspreis
     */
    public static DropshippingSourceDTO withCalculations(DropshippingSourceDTO base, BigDecimal salePrice) {
        if (salePrice == null || salePrice.compareTo(BigDecimal.ZERO) == 0) {
            return new DropshippingSourceDTO(
                    base.id, base.variantId, base.supplierType, base.supplierUrl, base.supplierName,
                    base.purchasePrice, base.estimatedShippingDays, base.supplierSku,
                    base.cjProductId, base.cjVariantId, base.notes,
                    salePrice, BigDecimal.ZERO, BigDecimal.ZERO
            );
        }

        BigDecimal profit = salePrice.subtract(base.purchasePrice);
        BigDecimal margin = profit.divide(salePrice, 4, java.math.RoundingMode.HALF_UP);

        return new DropshippingSourceDTO(
                base.id, base.variantId, base.supplierType, base.supplierUrl, base.supplierName,
                base.purchasePrice, base.estimatedShippingDays, base.supplierSku,
                base.cjProductId, base.cjVariantId, base.notes,
                salePrice, margin, profit
        );
    }
}

