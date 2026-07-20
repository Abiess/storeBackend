package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.PaymentWebhookEvent;
import storebackend.enums.PaymentProvider;

import java.util.Optional;

@Repository
public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEvent, Long> {
    
    /**
     * Sucht Event nach Provider und Provider-Event-ID
     * Verwendet für Deduplizierung
     */
    Optional<PaymentWebhookEvent> findByProviderAndProviderEventId(
        PaymentProvider provider, 
        String providerEventId
    );
    
    /**
     * Sucht Events nach Provider Order ID
     * Nützlich für Debugging und Audit
     */
    Optional<PaymentWebhookEvent> findFirstByProviderOrderIdOrderByReceivedAtDesc(String providerOrderId);
    
    /**
     * Sucht Events nach Provider Capture ID
     * Nützlich für Debugging und Audit
     */
    Optional<PaymentWebhookEvent> findFirstByProviderCaptureIdOrderByReceivedAtDesc(String providerCaptureId);
}
