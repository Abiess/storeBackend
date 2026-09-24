package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import storebackend.entity.LoyaltyIdentifier;

import java.util.List;
import java.util.Optional;

public interface LoyaltyIdentifierRepository extends JpaRepository<LoyaltyIdentifier, Long> {
    Optional<LoyaltyIdentifier> findByStoreIdAndIdentifier(Long storeId, String identifier);

    boolean existsByStoreIdAndIdentifier(Long storeId, String identifier);

    /**
     * Alle Identifier eines Stores, älteste zuerst - wird in
     * LoyaltyService.listAccounts() verwendet, um pro Account den
     * primären/ersten (bevorzugt aktiven) Identifier zu bestimmen.
     */
    List<LoyaltyIdentifier> findByStoreIdOrderByCreatedAtAsc(Long storeId);
}
