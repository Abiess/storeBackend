package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import storebackend.entity.LoyaltyTransaction;

import java.time.LocalDateTime;
import java.util.List;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {
    List<LoyaltyTransaction> findByLoyaltyAccountIdOrderByCreatedAtDesc(Long loyaltyAccountId);

    /**
     * Transaktionshistorie eines Accounts, zusätzlich per storeId abgesichert
     * (Multi-Tenant: verhindert, dass ein Store die Historie eines fremden
     * Accounts über eine erratene loyaltyAccountId einsehen kann).
     */
    List<LoyaltyTransaction> findByLoyaltyAccountIdAndStoreIdOrderByCreatedAtDesc(Long loyaltyAccountId, Long storeId);

    /**
     * Projektion für {@link #findLastEarnByStoreId}: pro Account der
     * Zeitpunkt der letzten EARN-Transaction ("Letzter Einkauf").
     */
    interface LastEarnProjection {
        Long getLoyaltyAccountId();
        LocalDateTime getLastEarnAt();
    }

    /**
     * Ein gruppiertes Aggregat statt N Einzelabfragen (kein N+1) für die
     * "Bonuskarten"-Übersicht (LoyaltyService.listAccounts).
     */
    @Query("SELECT t.loyaltyAccount.id AS loyaltyAccountId, MAX(t.createdAt) AS lastEarnAt " +
        "FROM LoyaltyTransaction t " +
        "WHERE t.store.id = :storeId AND t.type = storebackend.enums.LoyaltyTransactionType.EARN " +
        "GROUP BY t.loyaltyAccount.id")
    List<LastEarnProjection> findLastEarnByStoreId(@Param("storeId") Long storeId);
}
