package storebackend.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import storebackend.dto.EmailDeliveryResult;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.entity.Store;
import storebackend.entity.TelegramStoreConfig;
import storebackend.enums.OrderStatus;
import storebackend.repository.TelegramStoreConfigRepository;
import storebackend.repository.OrderRepository;
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
    private final OrderRepository orderRepository;  // Für Idempotenz-Flag

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
            // ═══════════════════════════════════════════════════════════════════════════
            // PENDING: Alte Logik - wird NICHT mehr verwendet
            // Orders werden jetzt direkt mit CONFIRMED (COD/Cash) oder PENDING_PAYMENT (PayPal) erstellt
            // ═══════════════════════════════════════════════════════════════════════════
            case PENDING:
                // Legacy-Support: Falls doch eine Order mit PENDING erstellt wird
                log.debug("Order in PENDING status - usually skipped, Orders go directly to CONFIRMED or PENDING_PAYMENT");
                break;

            // ═══════════════════════════════════════════════════════════════════════════
            // CONFIRMED: E-MAIL NUR BEI BESTÄTIGTER ZAHLUNG!
            // ═══════════════════════════════════════════════════════════════════════════
            case CONFIRMED:
                // ═══ IDEMPOTENZ-CHECK: E-Mail bereits versendet? ═══
                if (order.getConfirmationEmailSent()) {
                    log.info("Confirmation email already sent for order {} (idempotent)", orderNumber);
                    break;
                }
                
                // Prüfe PaymentStatus: E-Mail nur wenn PAID (PayPal nach Webhook) oder null (COD/Cash)
                storebackend.enums.PaymentStatus paymentStatus = order.getPaymentStatus();
                
                boolean shouldSendEmail = 
                    paymentStatus == storebackend.enums.PaymentStatus.PAID  // PayPal bezahlt
                    || paymentStatus == null;  // COD/Cash (keine Online-Zahlung)
                
                if (!shouldSendEmail) {
                    log.warn("Order CONFIRMED but payment not yet completed: orderId={}, orderNumber={}, paymentStatus={}", 
                        order.getId(), orderNumber, paymentStatus);
                    break;
                }
                
                log.info("Order confirmed with valid payment - sending notifications: orderId={}, paymentStatus={}", 
                    order.getId(), paymentStatus);
                
                // 1) E-Mail-Bestätigung an den Kunden – ZENTRAL mit strukturiertem Result
                EmailDeliveryResult confirmationResult = emailService.sendOrderConfirmationWithResult(
                    customerEmail, orderNumber, storeName,
                    order.getTotalAmount().doubleValue(),
                    items, storeLogo, lang
                );
                
                if (!confirmationResult.isSent()) {
                    log.warn(
                        "Order confirmation email failed: orderId={}, orderNumber={}, errorCode={}, message={}",
                        order.getId(), orderNumber, confirmationResult.errorCode(), confirmationResult.userMessage()
                    );
                }
                
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
                
                // ═══ IDEMPOTENZ-FLAG SETZEN ═══
                order.setConfirmationEmailSent(true);
                orderRepository.save(order);
                log.info("Confirmation email sent and flagged for order {}", orderNumber);
                
                break;

            case SHIPPED:
                String trackingUrl = order.getTrackingUrl();
                String carrier     = order.getTrackingCarrier();
                
                // Versandbenachrichtigung – ZENTRAL mit strukturiertem Result
                EmailDeliveryResult shippingResult = emailService.sendShippingNotificationWithResult(
                    customerEmail, orderNumber, storeName,
                    order.getTrackingNumber(), trackingUrl, carrier, storeLogo, lang
                );
                
                if (!shippingResult.isSent()) {
                    log.warn(
                        "Shipping notification email failed: orderId={}, orderNumber={}, errorCode={}, message={}",
                        order.getId(), orderNumber, shippingResult.errorCode(), shippingResult.userMessage()
                    );
                }
                
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
