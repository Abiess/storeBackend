package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SupplierInvoiceParseResult;

import java.util.Optional;

@Repository
public interface SupplierInvoiceParseResultRepository extends JpaRepository<SupplierInvoiceParseResult, Long> {
    
    /**
     * Parse-Result anhand Document-ID und Store-ID finden.
     * Wichtig für Cross-Store-Zugriffsprüfung.
     */
    Optional<SupplierInvoiceParseResult> findByDocumentIdAndStoreId(Long documentId, Long storeId);
    
    /**
     * Parse-Result anhand Document-ID finden (ohne Store-Filter).
     * Wird nach Store-Prüfung verwendet.
     */
    Optional<SupplierInvoiceParseResult> findByDocumentId(Long documentId);
    
    /**
     * Prüfen ob bereits ein Parse-Result für ein Dokument existiert.
     */
    boolean existsByDocumentIdAndStoreId(Long documentId, Long storeId);
}
