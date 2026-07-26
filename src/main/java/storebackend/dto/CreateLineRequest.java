package storebackend.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

/**
 * Request to manually create a new invoice line.
 */
public class CreateLineRequest {
    @NotBlank
    private String supplierArticleNumber;
    
    @NotBlank
    private String description;
    
    private BigDecimal quantity;
    private String unit;
    private BigDecimal packagingUnit;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
    private BigDecimal taxRate;
    
    // Getters and setters
    public String getSupplierArticleNumber() {
        return supplierArticleNumber;
    }
    
    public void setSupplierArticleNumber(String supplierArticleNumber) {
        this.supplierArticleNumber = supplierArticleNumber;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public BigDecimal getQuantity() {
        return quantity;
    }
    
    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }
    
    public String getUnit() {
        return unit;
    }
    
    public void setUnit(String unit) {
        this.unit = unit;
    }
    
    public BigDecimal getPackagingUnit() {
        return packagingUnit;
    }
    
    public void setPackagingUnit(BigDecimal packagingUnit) {
        this.packagingUnit = packagingUnit;
    }
    
    public BigDecimal getUnitPrice() {
        return unitPrice;
    }
    
    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }
    
    public BigDecimal getLineTotal() {
        return lineTotal;
    }
    
    public void setLineTotal(BigDecimal lineTotal) {
        this.lineTotal = lineTotal;
    }
    
    public BigDecimal getTaxRate() {
        return taxRate;
    }
    
    public void setTaxRate(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }
}
