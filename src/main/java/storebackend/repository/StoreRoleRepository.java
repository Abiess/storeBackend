package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.StoreRole;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRoleRepository extends JpaRepository<StoreRole, Long> {

    List<StoreRole> findByStoreId(Long storeId);

    Optional<StoreRole> findByStoreIdAndUserId(Long storeId, Long userId);

    /**
     * Findet alle StoreRoles eines Stores mit einer bestimmten Rolle.
     * Multi-Tenant-sicher: storeId ist WHERE-Bedingung.
     *
     * @param storeId ID des Stores (Multi-Tenant-Isolation)
     * @param role    Rolle (z.B. "STORE_MANAGER")
     * @return Liste von StoreRoles (kann leer sein)
     */
    @Query("SELECT sr FROM StoreRole sr WHERE sr.store.id = :storeId AND sr.role = :role")
    List<StoreRole> findByStoreIdAndRole(@Param("storeId") Long storeId,
                                          @Param("role") String role);

    void deleteByStoreIdAndUserId(Long storeId, Long userId);

    boolean existsByStoreIdAndUserId(Long storeId, Long userId);
}

