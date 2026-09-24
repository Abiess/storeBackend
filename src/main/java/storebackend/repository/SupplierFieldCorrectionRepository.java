package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.SupplierFieldCorrection;
import storebackend.enums.SupplierCorrectionFieldType;

import java.util.Optional;

@Repository
public interface SupplierFieldCorrectionRepository extends JpaRepository<SupplierFieldCorrection, Long> {
    
    /**
     * Find active correction by exact normalized match.
     * Used during parsing to apply learned corrections.
     */
    Optional<SupplierFieldCorrection> findByStoreIdAndFieldTypeAndNormalizedRawValueAndActiveTrue(
        Long storeId,
        SupplierCorrectionFieldType fieldType,
        String normalizedRawValue
    );
}
