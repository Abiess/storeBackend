package storebackend.enums;

/**
 * Field types that can be learned from user corrections.
 * Phase 3A: Only SUPPLIER_NAME.
 * Future: INVOICE_NUMBER, CUSTOMER_NUMBER, etc.
 */
public enum SupplierCorrectionFieldType {
    /**
     * Supplier/vendor name (Phase 3A).
     * Example: "R wm oe GmbH" → "MARZOUK HANDELS GMBH"
     */
    SUPPLIER_NAME
}
