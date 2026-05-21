package storebackend.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.entity.Store;
import storebackend.entity.TelegramStoreConfig;
import storebackend.enums.OrderStatus;
import storebackend.repository.TelegramStoreConfigRepository;
import storebackend.service.EmailService;
import storebackend.service.TelegramBotService;
import storebackend.service.WhatsAppService;

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
    private final WhatsAppService whatsAppService;
    private final TelegramBotService telegramBotService;
    private final TelegramStoreConfigRepository telegramConfigRepository;

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

        // WhatsApp: Kundennummer aus Lieferadresse + Store-Flag prüfen
        Store store = order.getStore();
        boolean waEnabled = store != null && store.isWhatsappNotificationsEnabled();
        String customerPhone = null;
        if (waEnabled && order.getShippingAddress() != null) {
            customerPhone = order.getShippingAddress().getPhone();
        }
        // Owner-WhatsApp: die im Store hinterlegte Nummer des Inhabers
        String ownerWhatsapp = (store != null) ? store.getWhatsappNumber() : null;

        // Telegram-Konfiguration des Stores laden (für Bot-Notifications)
        TelegramStoreConfig telegramCfg = (store != null)
            ? telegramConfigRepository.findByStoreId(store.getId()).orElse(null)
            : null;

        List<OrderItem> items = order.getOrderItems() != null ? order.getOrderItems() : List.of();

        switch (newStatus) {
            case PENDING:
                if (oldStatus == null) {
                    // 1) E-Mail-Bestätigung an den Kunden
                    emailService.sendOrderConfirmation(
                        customerEmail, orderNumber, storeName,
                        order.getTotalAmount().doubleValue(),
                        items, storeLogo, lang
                    );
                    // 2) WhatsApp-Bestätigung an den Kunden (wenn aktiviert + Nummer vorhanden)
                    if (waEnabled && customerPhone != null && !customerPhone.isBlank()) {
                        whatsAppService.sendOrderConfirmation(
                            customerPhone, orderNumber, storeName,
                            order.getTotalAmount().doubleValue(), lang);
                        log.info("[WA] Order confirmation sent to customer {}", customerPhone);
                    }
                    // 3) Neue-Bestellung-Benachrichtigung an den Store-Owner (E-Mail)
                    String customerName   = order.getCustomer() != null ? order.getCustomer().getName()  : null;
                    String paymentMethod  = order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null;
                    emailService.sendNewOrderNotificationToOwner(
                        ownerEmail, ownerLang,
                        orderNumber, storeName, storeLogo,
                        order.getTotalAmount().doubleValue(),
                        customerEmail, customerName, paymentMethod, items
                    );
                    // 4) Neue-Bestellung-Benachrichtigung an Owner via WhatsApp
                    if (ownerWhatsapp != null && !ownerWhatsapp.isBlank()) {
                        whatsAppService.sendNewOrderToOwner(
                            ownerWhatsapp, orderNumber, storeName,
                            order.getTotalAmount().doubleValue(), customerEmail, ownerLang);
                        log.info("[WA] New order notification sent to owner {}", ownerWhatsapp);
                    }
                    // 5) Neue-Bestellung-Benachrichtigung an Owner via Telegram Bot
                    if (telegramCfg != null && telegramBotService.isConfigured(telegramCfg)) {
                        telegramBotService.sendNewOrderNotification(telegramCfg, order);
                        log.info("[Telegram] New order notification sent via Bot for store {}", store.getId());
                    }
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
                if (waEnabled && customerPhone != null && !customerPhone.isBlank()) {
                    whatsAppService.sendShippingNotification(
                        customerPhone, orderNumber, storeName, order.getTrackingNumber(), lang);
                    log.info("[WA] Shipping notification sent to customer {}", customerPhone);
                }
                break;

            case DELIVERED:
                emailService.sendDeliveryConfirmation(
                    customerEmail, orderNumber, storeName, storeLogo, lang
                );
                if (waEnabled && customerPhone != null && !customerPhone.isBlank()) {
                    whatsAppService.sendDeliveryConfirmation(
                        customerPhone, orderNumber, storeName, lang);
                    log.info("[WA] Delivery confirmation sent to customer {}", customerPhone);
                }
                break;

            case CANCELLED:
                emailService.sendOrderCancellation(
                    customerEmail, orderNumber, storeName,
                    order.getNotes(), storeLogo, lang
                );
                if (waEnabled && customerPhone != null && !customerPhone.isBlank()) {
                    whatsAppService.sendOrderCancellation(
                        customerPhone, orderNumber, storeName, lang);
                    log.info("[WA] Cancellation notification sent to customer {}", customerPhone);
                }
                break;

            case REFUNDED:
                log.info("Order refunded: {} – consider sending refund confirmation", orderNumber);
                break;

            default:
                log.info("No notification configured for status: {}", newStatus);
                break;
        }
    }
}
