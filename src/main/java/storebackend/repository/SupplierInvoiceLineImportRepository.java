package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.SupplierInvoiceLineImport;

import java.util.List;
import java.util.Optional;

/**
 * Phase 4A: Repository für Import-Logs von Rechnungspositionen.
 */
public interface SupplierInvoiceLineImportRepository extends JpaRepository<SupplierInvoiceLineImport, Long> {
    
    /**
     * Prüft ob eine Position bereits importiert wurde (Duplikat-Check).
     */
    boolean existsByDocumentIdAndLineId(Long documentId, Long lineId);
    
    /**
     * Findet Import-Log für eine bestimmte Position.
     */
    Optional<SupplierInvoiceLineImport> findByDocumentIdAndLineId(Long documentId, Long lineId);
    
    /**
     * Alle Imports für ein Dokument.
     */
    List<SupplierInvoiceLineImport> findByDocumentIdOrderByImportedAtDesc(Long documentId);
    
    /**
     * Alle Imports für einen Store.
     */
    List<SupplierInvoiceLineImport> findByStoreIdOrderByImportedAtDesc(Long storeId);
}
