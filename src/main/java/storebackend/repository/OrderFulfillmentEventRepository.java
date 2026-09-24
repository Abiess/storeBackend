package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.OrderFulfillmentEvent;

import java.util.Optional;

@Repository
public interface OrderFulfillmentEventRepository extends JpaRepository<OrderFulfillmentEvent, Long> {
    
    /**
     * Prüft ob Fulfillment-Event bereits existiert
     * Verwendet für Idempotenz
     */
    Optional<OrderFulfillmentEvent> findByOrderIdAndEventType(Long orderId, String eventType);
    
    /**
     * Prüft ob Event existiert (boolean)
     */
    boolean existsByOrderIdAndEventType(Long orderId, String eventType);
}
