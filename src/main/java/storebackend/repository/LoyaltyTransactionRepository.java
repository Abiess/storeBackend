package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.LoyaltyTransaction;

import java.util.List;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {
    List<LoyaltyTransaction> findByLoyaltyAccountIdOrderByCreatedAtDesc(Long loyaltyAccountId);
}
