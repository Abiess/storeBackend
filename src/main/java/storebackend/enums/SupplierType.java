package storebackend.enums;

/**
 * Supplier Type für Dropshipping
 * Phase 1: MANUAL (Link-based)
 * Phase 2: CJ (API-based)
 */
public enum SupplierType {
    /**
     * Manueller Workflow: Reseller klickt Link und bestellt selbst
     */
    MANUAL,

    /**
     * CJ Dropshipping API Integration
     */
    CJ,

    /**
     * AliExpress API (für Phase 3+)
     */
    ALIEXPRESS,

    /**
     * Alibaba API (für Phase 3+)
     */
    ALIBABA
}

