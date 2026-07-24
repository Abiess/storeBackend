package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import storebackend.entity.SupplierInvoiceDocument;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierInvoiceDocumentRepository extends JpaRepository<SupplierInvoiceDocument, Long> {

    /**
     * WICHTIG: Immer storeId in Query einbeziehen (Multi-Tenant-Sicherheit)
     */
    @Query("SELECT d FROM SupplierInvoiceDocument d WHERE d.id = :documentId AND d.store.id = :storeId")
    Optional<SupplierInvoiceDocument> findByIdAndStoreId(Long documentId, Long storeId);

    /**
     * Alle Dokumente eines Stores
     */
    @Query("SELECT d FROM SupplierInvoiceDocument d WHERE d.store.id = :storeId ORDER BY d.createdAt DESC")
    List<SupplierInvoiceDocument> findByStoreId(Long storeId);

    /**
     * Anzahl Dokumente für einen Store
     */
    long countByStoreId(Long storeId);
}
