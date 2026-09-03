package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.LoyaltyAccount;

import java.util.Optional;

public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, Long> {
    Optional<LoyaltyAccount> findByStoreIdAndCustomerProfileId(Long storeId, Long customerProfileId);
}
