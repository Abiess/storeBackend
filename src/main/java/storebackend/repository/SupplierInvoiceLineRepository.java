package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SupplierInvoiceLine;

import java.util.List;

/**
 * Phase 3B-1: Repository for invoice line items.
 */
@Repository
public interface SupplierInvoiceLineRepository extends JpaRepository<SupplierInvoiceLine, Long> {
    
    /**
     * Find all lines for a document, ordered by position number.
     */
    List<SupplierInvoiceLine> findByDocumentIdOrderByPositionNumberAsc(Long documentId);
    
    /**
     * Find all lines for a document and store (security check).
     */
    List<SupplierInvoiceLine> findByDocumentIdAndStoreIdOrderByPositionNumberAsc(Long documentId, Long storeId);
    
    /**
     * Delete all lines for a document (for force=true reparse).
     */
    void deleteByDocumentId(Long documentId);
    
    /**
     * Count lines for a document.
     */
    long countByDocumentId(Long documentId);
}
