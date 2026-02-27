package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SupplierConnection;
import storebackend.enums.SupplierType;

import java.util.Optional;

@Repository
public interface SupplierConnectionRepository extends JpaRepository<SupplierConnection, Long> {

    /**
     * Finde Connection für Store + Supplier Type
     */
    Optional<SupplierConnection> findByStoreIdAndSupplierType(Long storeId, SupplierType supplierType);

    /**
     * Prüfe ob Connection existiert
     */
    boolean existsByStoreIdAndSupplierType(Long storeId, SupplierType supplierType);

    /**
     * Lösche Connection
     */
    void deleteByStoreIdAndSupplierType(Long storeId, SupplierType supplierType);
}

