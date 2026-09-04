package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.CreditTransaction;
import storebackend.enums.CreditTransactionType;

import java.util.List;

/**
 * Repository für {@link CreditTransaction} (Audit-Trail von CustomerCreditAccount.balanceOwed).
 */
public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, Long> {
    List<CreditTransaction> findByCreditAccountIdAndStoreIdOrderByCreatedAtDesc(Long creditAccountId, Long storeId);

    /**
     * Duplicate-Charge-Schutz auf Anwendungsebene (schnelle Fehlermeldung VOR
     * dem DB-Insert). Die eigentliche Garantie liefert der Partial-Unique-Index
     * idx_credit_tx_unique_charge_per_order (V023) als letzte Sicherheitsebene.
     */
    boolean existsByStoreIdAndOrderIdAndType(Long storeId, Long orderId, CreditTransactionType type);
}
