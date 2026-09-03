package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import storebackend.entity.LoyaltyAccount;

import java.util.List;
import java.util.Optional;

public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, Long> {
    Optional<LoyaltyAccount> findByStoreIdAndCustomerProfileId(Long storeId, Long customerProfileId);

    /**
     * Lädt alle Loyalty-Accounts eines Stores für die "Bonuskarten"-Übersicht.
     * LEFT JOIN FETCH auf customerProfile/user vermeidet N+1-Queries beim
     * Auflösen des Kundennamens pro Account (siehe LoyaltyService.listAccounts).
     */
    @Query("SELECT la FROM LoyaltyAccount la " +
        "LEFT JOIN FETCH la.customerProfile cp " +
        "LEFT JOIN FETCH cp.user " +
        "WHERE la.store.id = :storeId " +
        "ORDER BY la.createdAt DESC")
    List<LoyaltyAccount> findAllByStoreIdWithCustomer(@Param("storeId") Long storeId);
}
