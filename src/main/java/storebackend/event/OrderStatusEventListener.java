package storebackend.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import storebackend.entity.Order;
import storebackend.enums.OrderStatus;
import storebackend.service.EmailService;

/**
 * Listener für Order-Status-Änderungen
 * Sendet automatisch E-Mails an Kunden wenn sich der Status ändert
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderStatusEventListener {

    private final EmailService emailService;

    @Async
    @EventListener
    public void handleOrderStatusChange(OrderStatusChangedEvent event) {
        Order order = event.getOrder();
        OrderStatus newStatus = event.getNewStatus();
        OrderStatus oldStatus = event.getOldStatus();

        log.info("Order status changed: Order={}, {} → {}",
                order.getOrderNumber(), oldStatus, newStatus);

        String customerEmail = order.getCustomerEmail();
        String orderNumber = order.getOrderNumber();
        String storeName = order.getStore() != null ? order.getStore().getName() : "Markt.ma";

        if (customerEmail == null || customerEmail.isEmpty()) {
            log.warn("Cannot send email - customer email is null for order: {}", orderNumber);
            return;
        }

        // Entscheide basierend auf neuem Status, welche Email gesendet werden soll
        switch (newStatus) {
            case PENDING:
                // Bestellung wurde aufgegeben
                if (oldStatus == null) {
                    emailService.sendOrderConfirmation(
                        customerEmail,
                        orderNumber,
                        storeName,
                        order.getTotalAmount().doubleValue()
                    );
                }
                break;

            case CONFIRMED:
                // Bestellung wurde bestätigt (optional - kann auch übersprungen werden)
                log.info("Order confirmed, no email sent (already sent at PENDING)");
                break;

            case SHIPPED:
                // Bestellung wurde versendet
                emailService.sendShippingNotification(
                    customerEmail,
                    orderNumber,
                    storeName,
                    order.getTrackingNumber()
                );
                break;

            case DELIVERED:
                // Bestellung wurde zugestellt
                emailService.sendDeliveryConfirmation(
                    customerEmail,
                    orderNumber,
                    storeName
                );
                break;

            case CANCELLED:
                // Bestellung wurde storniert
                emailService.sendOrderCancellation(
                    customerEmail,
                    orderNumber,
                    storeName,
                    order.getNotes() // Notes können Stornierungsgrund enthalten
                );
                break;

            case REFUNDED:
                // Rückerstattung erfolgt (optional)
                log.info("Order refunded: {}, consider sending refund confirmation", orderNumber);
                break;

            default:
                log.info("No email configured for status: {}", newStatus);
                break;
        }
    }
}

