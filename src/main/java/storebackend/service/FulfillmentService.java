package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Order;
import storebackend.entity.OrderFulfillmentEvent;
import storebackend.entity.PaymentTransaction;
import storebackend.enums.OrderStatus;
import storebackend.repository.OrderFulfillmentEventRepository;
import storebackend.repository.OrderRepository;

/**
 * FulfillmentService - Zentrale idempotente Fulfillment-Logik
 * 
 * KRITISCH:
 * - Alle Geschäftsprozesse nach erfolgreicher Zahlung
 * - Idempotent: Mehrfacher Aufruf ändert nichts
 * - Race-Safe: Frontend-Capture und Webhook können gleichzeitig ankommen
 * - Persistente Flags via OrderFulfillmentEvent verhindern Doppelverarbeitung
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FulfillmentService {
    
    private final OrderRepository orderRepo;
    private final OrderFulfillmentEventRepository fulfillmentEventRepo;
    // TODO: Weitere Services nach Bedarf injizieren:
    // private final EmailService emailService;
    // private final NotificationService notificationService;
    
    /**
     * Zentrale Methode zur Order-Bestätigung nach erfolgreicher Zahlung
     * 
     * IDEMPOTENT: Mehrfacher Aufruf ändert nichts
     * 
     * @param orderId Order-ID
     * @param paymentTransactionId Payment-Transaction-ID
     * @param triggeredBy "FRONTEND_CAPTURE", "WEBHOOK", "MANUAL"
     */
    @Transactional
    public void confirmPaidOrder(Long orderId, Long paymentTransactionId, String triggeredBy) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        
        // 1. Order-Status bestätigen (idempotent)
        if (!confirmOrderStatus(order, paymentTransactionId, triggeredBy)) {
            log.info("Order already confirmed, skipping fulfillment: orderId={}", orderId);
            return;
        }
        
        // 2. Bestellbestätigung per E-Mail (idempotent)
        sendConfirmationEmail(order, paymentTransactionId, triggeredBy);
        
        // 3. Admin-Benachrichtigung (idempotent)
        notifyAdmin(order, paymentTransactionId, triggeredBy);
        
        // 4. Telegram/WhatsApp-Benachrichtigung (idempotent)
        sendInstantNotifications(order, paymentTransactionId, triggeredBy);
        
        log.info("Order fulfillment completed: orderId={}, triggeredBy={}", orderId, triggeredBy);
    }
    
    /**
     * Bestätigt Order-Status CONFIRMED (idempotent)
     * 
     * @return true wenn neu bestätigt, false wenn bereits bestätigt
     */
    private boolean confirmOrderStatus(Order order, Long paymentTransactionId, String triggeredBy) {
        String eventType = "ORDER_CONFIRMED";
        
        // Idempotenz-Check: Event bereits vorhanden?
        if (fulfillmentEventRepo.existsByOrderIdAndEventType(order.getId(), eventType)) {
            log.debug("Fulfillment event already exists: orderId={}, eventType={}", order.getId(), eventType);
            return false;
        }
        
        // Order-Status setzen
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            order.setStatus(OrderStatus.CONFIRMED);
            order.setUpdatedAt(java.time.LocalDateTime.now());
            orderRepo.save(order);
            log.info("Order status updated to CONFIRMED: orderId={}", order.getId());
        }
        
        // Event persistieren
        OrderFulfillmentEvent event = OrderFulfillmentEvent.builder()
            .order(order)
            .eventType(eventType)
            .paymentTransaction(paymentTransactionId != null ? 
                new PaymentTransaction() {{ setId(paymentTransactionId); }} : null)
            .triggeredBy(triggeredBy)
            .build();
        
        fulfillmentEventRepo.save(event);
        log.info("Fulfillment event persisted: orderId={}, eventType={}, triggeredBy={}", 
            order.getId(), eventType, triggeredBy);
        
        return true;
    }
    
    /**
     * Sendet Bestellbestätigung per E-Mail (idempotent)
     */
    private void sendConfirmationEmail(Order order, Long paymentTransactionId, String triggeredBy) {
        String eventType = "CONFIRMATION_EMAIL_SENT";
        
        // Idempotenz-Check
        if (fulfillmentEventRepo.existsByOrderIdAndEventType(order.getId(), eventType)) {
            log.debug("Confirmation email already sent: orderId={}", order.getId());
            return;
        }
        
        try {
            // TODO: Echte E-Mail senden
            // emailService.sendOrderConfirmation(order);
            log.info("Confirmation email sent (STUB): orderId={}, email={}", 
                order.getId(), order.getCustomerEmail());
            
            // Event persistieren
            OrderFulfillmentEvent event = OrderFulfillmentEvent.builder()
                .order(order)
                .eventType(eventType)
                .paymentTransaction(paymentTransactionId != null ? 
                    new PaymentTransaction() {{ setId(paymentTransactionId); }} : null)
                .triggeredBy(triggeredBy)
                .build();
            
            fulfillmentEventRepo.save(event);
            
        } catch (Exception e) {
            log.error("Failed to send confirmation email: orderId={}", order.getId(), e);
            // Nicht durchschlagen - andere Fulfillment-Schritte weiterlaufen lassen
        }
    }
    
    /**
     * Benachrichtigt Admin über neue Bestellung (idempotent)
     */
    private void notifyAdmin(Order order, Long paymentTransactionId, String triggeredBy) {
        String eventType = "ADMIN_NOTIFIED";
        
        // Idempotenz-Check
        if (fulfillmentEventRepo.existsByOrderIdAndEventType(order.getId(), eventType)) {
            log.debug("Admin already notified: orderId={}", order.getId());
            return;
        }
        
        try {
            // TODO: Echte Admin-Benachrichtigung
            // notificationService.notifyNewOrder(order);
            log.info("Admin notified (STUB): orderId={}, storeId={}", 
                order.getId(), order.getStore().getId());
            
            // Event persistieren
            OrderFulfillmentEvent event = OrderFulfillmentEvent.builder()
                .order(order)
                .eventType(eventType)
                .paymentTransaction(paymentTransactionId != null ? 
                    new PaymentTransaction() {{ setId(paymentTransactionId); }} : null)
                .triggeredBy(triggeredBy)
                .build();
            
            fulfillmentEventRepo.save(event);
            
        } catch (Exception e) {
            log.error("Failed to notify admin: orderId={}", order.getId(), e);
        }
    }
    
    /**
     * Sendet Instant-Benachrichtigungen (Telegram/WhatsApp) (idempotent)
     */
    private void sendInstantNotifications(Order order, Long paymentTransactionId, String triggeredBy) {
        // Telegram
        sendTelegramNotification(order, paymentTransactionId, triggeredBy);
        
        // WhatsApp
        sendWhatsAppNotification(order, paymentTransactionId, triggeredBy);
    }
    
    private void sendTelegramNotification(Order order, Long paymentTransactionId, String triggeredBy) {
        String eventType = "TELEGRAM_SENT";
        
        if (fulfillmentEventRepo.existsByOrderIdAndEventType(order.getId(), eventType)) {
            return;
        }
        
        try {
            // TODO: Echte Telegram-Benachrichtigung
            log.debug("Telegram notification sent (STUB): orderId={}", order.getId());
            
            OrderFulfillmentEvent event = OrderFulfillmentEvent.builder()
                .order(order)
                .eventType(eventType)
                .paymentTransaction(paymentTransactionId != null ? 
                    new PaymentTransaction() {{ setId(paymentTransactionId); }} : null)
                .triggeredBy(triggeredBy)
                .build();
            
            fulfillmentEventRepo.save(event);
            
        } catch (Exception e) {
            log.error("Failed to send Telegram notification: orderId={}", order.getId(), e);
        }
    }
    
    private void sendWhatsAppNotification(Order order, Long paymentTransactionId, String triggeredBy) {
        String eventType = "WHATSAPP_SENT";
        
        if (fulfillmentEventRepo.existsByOrderIdAndEventType(order.getId(), eventType)) {
            return;
        }
        
        try {
            // TODO: Echte WhatsApp-Benachrichtigung
            log.debug("WhatsApp notification sent (STUB): orderId={}", order.getId());
            
            OrderFulfillmentEvent event = OrderFulfillmentEvent.builder()
                .order(order)
                .eventType(eventType)
                .paymentTransaction(paymentTransactionId != null ? 
                    new PaymentTransaction() {{ setId(paymentTransactionId); }} : null)
                .triggeredBy(triggeredBy)
                .build();
            
            fulfillmentEventRepo.save(event);
            
        } catch (Exception e) {
            log.error("Failed to send WhatsApp notification: orderId={}", order.getId(), e);
        }
    }
}
