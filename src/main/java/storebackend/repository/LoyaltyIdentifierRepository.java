package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.LoyaltyIdentifier;

import java.util.Optional;

public interface LoyaltyIdentifierRepository extends JpaRepository<LoyaltyIdentifier, Long> {
    Optional<LoyaltyIdentifier> findByStoreIdAndIdentifier(Long storeId, String identifier);

    boolean existsByStoreIdAndIdentifier(Long storeId, String identifier);
}
