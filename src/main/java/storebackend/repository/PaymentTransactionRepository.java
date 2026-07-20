package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.PaymentTransaction;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    
    /**
     * Finde Payment-Transaction anhand Provider Order ID
     */
    Optional<PaymentTransaction> findByProviderAndProviderOrderId(
        PaymentProvider provider, 
        String providerOrderId
    );
    
    /**
     * Finde Payment-Transaction anhand Idempotency Key
     */
    Optional<PaymentTransaction> findByIdempotencyKey(String idempotencyKey);
    
    /**
     * Finde alle Transactions für eine Order
     */
    List<PaymentTransaction> findByOrderIdOrderByCreatedAtDesc(Long orderId);
    
    /**
     * Finde letzte Transaction für eine Order mit bestimmtem Provider
     */
    Optional<PaymentTransaction> findFirstByOrderIdAndProviderOrderByCreatedAtDesc(
        Long orderId, 
        PaymentProvider provider
    );
    
    /**
     * Finde alle Transactions mit bestimmtem Status für einen Store
     */
    List<PaymentTransaction> findByStoreIdAndStatus(Long storeId, PaymentStatus status);
}
