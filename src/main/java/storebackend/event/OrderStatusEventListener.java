package storebackend.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.enums.OrderStatus;
import storebackend.service.EmailService;

import java.util.List;

/**
 * Listener für Order-Status-Änderungen.
 * Sendet automatisch mehrsprachige HTML-E-Mails an Kunden wenn sich der Status ändert.
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

        log.info("Order status changed: Order={}, {} → {}", order.getOrderNumber(), oldStatus, newStatus);

        String customerEmail = order.getCustomerEmail();
        String orderNumber   = order.getOrderNumber();
        String storeName     = order.getStore() != null ? order.getStore().getName() : "Markt.ma";
        String storeLogo     = order.getStore() != null ? order.getStore().getLogoUrl() : null;

        // Sprache des Kunden ermitteln – Fallback "en"
        String lang = "en";
        if (order.getCustomer() != null) {
            lang = order.getCustomer().getPreferredLanguage();
        }

        if (customerEmail == null || customerEmail.isEmpty()) {
            log.warn("Cannot send email – customer email is null for order: {}", orderNumber);
            return;
        }

        // Store-Owner E-Mail & Sprache ermitteln
        String ownerEmail = null;
        String ownerLang  = "en";
        if (order.getStore() != null && order.getStore().getOwner() != null) {
            ownerEmail = order.getStore().getOwner().getEmail();
            ownerLang  = order.getStore().getOwner().getPreferredLanguage();
        }

        List<OrderItem> items = order.getOrderItems() != null ? order.getOrderItems() : List.of();

        switch (newStatus) {
            case PENDING:
                if (oldStatus == null) {
                    // 1) Bestätigung an den Kunden
                    emailService.sendOrderConfirmation(
                        customerEmail, orderNumber, storeName,
                        order.getTotalAmount().doubleValue(),
                        items, storeLogo, lang
                    );
                    // 2) Neue-Bestellung-Benachrichtigung an den Store-Owner
                    String customerName   = order.getCustomer() != null ? order.getCustomer().getName()  : null;
                    String paymentMethod  = order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null;
                    emailService.sendNewOrderNotificationToOwner(
                        ownerEmail, ownerLang,
                        orderNumber, storeName, storeLogo,
                        order.getTotalAmount().doubleValue(),
                        customerEmail, customerName, paymentMethod, items
                    );
                }
                break;

            case CONFIRMED:
                log.info("Order confirmed – no extra email (already sent at PENDING)");
                break;

            case SHIPPED:
                String trackingUrl = order.getTrackingUrl();
                String carrier     = order.getTrackingCarrier();
                emailService.sendShippingNotification(
                    customerEmail, orderNumber, storeName,
                    order.getTrackingNumber(), trackingUrl, carrier, storeLogo, lang
                );
                break;

            case DELIVERED:
                emailService.sendDeliveryConfirmation(
                    customerEmail, orderNumber, storeName, storeLogo, lang
                );
                break;

            case CANCELLED:
                emailService.sendOrderCancellation(
                    customerEmail, orderNumber, storeName,
                    order.getNotes(), storeLogo, lang
                );
                break;

            case REFUNDED:
                log.info("Order refunded: {} – consider sending refund confirmation", orderNumber);
                break;

            default:
                log.info("No email configured for status: {}", newStatus);
                break;
        }
    }
}
