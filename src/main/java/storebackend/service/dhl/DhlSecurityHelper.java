package storebackend.service.dhl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import storebackend.entity.Order;
import storebackend.entity.User;
import storebackend.repository.OrderRepository;

/**
 * DHL Security Helper - Store Owner Checks
 * 
 * WICHTIG: Label-Endpunkte sollen NICHT nur für ADMIN sein!
 * Normale Store Owner müssen Labels für ihre eigenen Bestellungen erstellen können.
 * 
 * Authorization-Strategie:
 * - Controller: @PreAuthorize("isAuthenticated()") → Jeder eingeloggte User
 * - Service: Store-Owner-Check → Nur Owner der Bestellung darf Label erstellen
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlSecurityHelper {
    
    private final OrderRepository orderRepository;
    
    /**
     * Prüft ob der aktuelle User der Owner der Bestellung ist
     * 
     * @param orderId Order ID
     * @param currentUser Aktuell eingeloggter User
     * @throws AccessDeniedException wenn User nicht der Store Owner ist
     * @return Order Entity wenn authorized
     */
    public Order checkOrderOwnership(Long orderId, User currentUser) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        
        Long storeOwnerId = order.getStore().getOwner().getId();
        Long currentUserId = currentUser.getId();
        
        if (!storeOwnerId.equals(currentUserId)) {
            log.warn("❌ Access denied: User {} tried to access order {} (belongs to user {})",
                currentUserId, orderId, storeOwnerId);
            throw new AccessDeniedException(
                "You are not authorized to create DHL labels for this order"
            );
        }
        
        log.debug("✅ Access granted: User {} owns store of order {}", currentUserId, orderId);
        return order;
    }
    
    /**
     * Prüft ob User Platform Admin ist (für globale DHL Health Checks etc.)
     */
    public boolean isPlatformAdmin(User user) {
        return user.getRoles().stream()
            .anyMatch(role -> role.name().equals("ROLE_PLATFORM_ADMIN"));
    }
}
