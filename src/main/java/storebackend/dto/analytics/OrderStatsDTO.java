package storebackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentMethod;

import java.util.Map;

/**
 * Analytics: Order Statistics DTO
 * 
 * Bestellungen gruppiert nach Status und Zahlungsart
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatsDTO {
    
    /**
     * Bestellungen nach Status
     * Key: OrderStatus (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
     * Value: Anzahl Bestellungen
     */
    private Map<OrderStatus, Long> ordersByStatus;
    
    /**
     * Bestellungen nach Zahlungsart
     * Key: PaymentMethod (PAYPAL, STRIPE, BANK_TRANSFER, etc.)
     * Value: Anzahl Bestellungen
     */
    private Map<PaymentMethod, Long> ordersByPaymentMethod;
}
