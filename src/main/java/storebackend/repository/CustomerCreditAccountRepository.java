package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.CustomerCreditAccount;

import java.util.List;
import java.util.Optional;

/**
 * Repository für {@link CustomerCreditAccount}. Ein CreditAccount ist 1:1
 * an einen bestehenden LoyaltyAccount gebunden (siehe Entity-Doku) - es gibt
 * kein eigenes Karten-/Kundenkonzept.
 */
public interface CustomerCreditAccountRepository extends JpaRepository<CustomerCreditAccount, Long> {
    Optional<CustomerCreditAccount> findByLoyaltyAccountId(Long loyaltyAccountId);

    /** Für die Bonuskarten-Übersicht (batch statt N+1, analog zu LoyaltyAccountRepository) */
    List<CustomerCreditAccount> findByStoreId(Long storeId);
}
