package storebackend.enums;

/**
 * Status of an invoice line item.
 */
public enum LineStatus {
    /**
     * Line has not been reviewed by user yet.
     */
    UNREVIEWED,
    
    /**
     * Line needs review (has warnings or low confidence).
     */
    REVIEW_REQUIRED,
    
    /**
     * Line has been confirmed by user (values are correct).
     */
    CONFIRMED,
    
    /**
     * Line has been mapped to a store product.
     */
    MAPPED
}
