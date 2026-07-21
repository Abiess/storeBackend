package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.EmailDeliveryResult;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.entity.Store;
import storebackend.entity.TelegramStoreConfig;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentStatus;
import storebackend.repository.OrderRepository;
import storebackend.repository.TelegramStoreConfigRepository;

import java.util.List;

/**
 * OrderCompletionService - Zentraler idempotenter Order-Completion-Flow
 * 
 * KRITISCH:
 * - Wird nach erfolgreicher Zahlung aufgerufen (PayPal Capture, Webhook, etc.)
 * - Idempotent: Mehrfacher Aufruf ändert nichts
 * - Race-Safe: Frontend-Capture und Webhook können gleichzeitig ankommen
 * - Nutzt Order.confirmationEmailSent und Order.inventoryAdjusted als Idempotenz-Flags
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class OrderCompletionService {
    
    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final TelegramBotService telegramBotService;
    private final TelegramStoreConfigRepository telegramConfigRepository;
    
    /**
     * Zentrale Methode für Order-Completion nach erfolgreicher Zahlung
     * 
     * IDEMPOTENT: Mehrfacher Aufruf ändert nichts
     * 
     * Workflow:
     * 1. Prüfung: PaymentStatus = PAID?
     * 2. Bestand reduzieren (wenn noch nicht geschehen)
     * 3. E-Mails senden (wenn noch nicht geschehen)
     * 4. Benachrichtigungen senden
     * 
     * @param orderId Order-ID
     */
    @Transactional
    public void completePaidOrder(Long orderId) {
        log.info("[ORDER-COMPLETE] Starting completion for order {}", orderId);
        
        // Order mit pessimistic lock laden (verhindert Race Conditions)
        Order order = orderRepository.findByIdForUpdate(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        
        // 1. Prüfung: PaymentStatus = PAID?
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            log.warn("[ORDER-COMPLETE] Order {} not yet PAID (status={}), skipping completion", 
                orderId, order.getPaymentStatus());
            return;
        }
        
        // 2. Bestand reduzieren (idempotent)
        if (!order.getInventoryAdjusted()) {
            try {
                log.info("[INVENTORY] Adjusting inventory for order {}", orderId);
                inventoryService.adjustForOrder(order);
                order.setInventoryAdjusted(true);
                orderRepository.save(order);
                log.info("[INVENTORY] Inventory adjusted successfully for order {}", orderId);
            } catch (Exception e) {
                log.error("[INVENTORY-ERROR] Failed to adjust inventory for order {}: {}", orderId, e.getMessage(), e);
                // Weiter mit E-Mails trotz Inventory-Fehler
            }
        } else {
            log.debug("[INVENTORY] Inventory already adjusted for order {} (idempotent)", orderId);
        }
        
        // 3. E-Mails senden (idempotent)
        if (!order.getConfirmationEmailSent()) {
            try {
                sendOrderConfirmationEmails(order);
                order.setConfirmationEmailSent(true);
                orderRepository.save(order);
                log.info("[ORDER-COMPLETE] confirmationEmailSent=true for order {}", orderId);
            } catch (Exception e) {
                log.error("[EMAIL-ERROR] Confirmation failed for order {}: {}", orderId, e.getMessage(), e);
                // confirmationEmailSent bleibt false → Retry möglich
            }
        } else {
            log.debug("[EMAIL] Confirmation email already sent for order {} (idempotent)", orderId);
        }
        
        // 4. Instant-Benachrichtigungen (idempotent über eigene Flags falls nötig, aktuell best-effort)
        sendInstantNotifications(order);
        
        log.info("[ORDER-COMPLETE] Completion finished for order {}", orderId);
    }
    
    /**
     * Sendet alle Bestellbestätigungs-E-Mails
     * - Kunde: Bestellbestätigung
     * - Händler: Neue-Bestellung-Benachrichtigung
     */
    private void sendOrderConfirmationEmails(Order order) {
        String orderNumber = order.getOrderNumber();
        Store store = order.getStore();
        String storeName = store != null ? store.getName() : "Markt.ma";
        String storeLogo = store != null ? store.getLogoUrl() : null;
        List<OrderItem> items = order.getOrderItems() != null ? order.getOrderItems() : List.of();
        
        // Kunden-Sprache ermitteln
        String customerLang = "en";
        if (order.getCustomer() != null && order.getCustomer().getPreferredLanguage() != null) {
            customerLang = order.getCustomer().getPreferredLanguage();
        }
        
        // 1. E-Mail an Kunde
        String customerEmail = order.getCustomerEmail();
        if (customerEmail != null && !customerEmail.isBlank()) {
            log.info("[EMAIL] Sending confirmation to customer: order={}, email={}", orderNumber, customerEmail);
            
            EmailDeliveryResult result = emailService.sendOrderConfirmationWithResult(
                customerEmail, 
                orderNumber, 
                storeName,
                order.getTotalAmount().doubleValue(),
                items, 
                storeLogo, 
                customerLang
            );
            
            if (result.isSent()) {
                log.info("[EMAIL] Confirmation sent successfully to customer: order={}", orderNumber);
            } else {
                log.error("[EMAIL-ERROR] Failed to send confirmation to customer: order={}, error={}, message={}", 
                    orderNumber, result.errorCode(), result.userMessage());
                throw new RuntimeException("Failed to send customer email: " + result.errorCode());
            }
        }
        
        // 2. E-Mail an Händler
        String ownerEmail = null;
        String ownerLang = "en";
        if (store != null && store.getOwner() != null) {
            ownerEmail = store.getOwner().getEmail();
            if (store.getOwner().getPreferredLanguage() != null) {
                ownerLang = store.getOwner().getPreferredLanguage();
            }
        }
        
        if (ownerEmail != null && !ownerEmail.isBlank()) {
            log.info("[EMAIL] Sending new-order notification to owner: order={}, email={}", orderNumber, ownerEmail);
            
            String customerName = order.getCustomer() != null ? order.getCustomer().getName() : null;
            String paymentMethod = order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null;
            
            emailService.sendNewOrderNotificationToOwner(
                ownerEmail, 
                ownerLang,
                orderNumber, 
                storeName, 
                storeLogo,
                order.getTotalAmount().doubleValue(),
                customerEmail, 
                customerName, 
                paymentMethod, 
                items
            );
            
            log.info("[EMAIL] New-order notification sent to owner: order={}", orderNumber);
        }
    }
    
    /**
     * Sendet Instant-Benachrichtigungen (WhatsApp, Telegram)
     * Best-Effort: Fehler werden geloggt, aber nicht durchgeschlagen
     */
    private void sendInstantNotifications(Order order) {
        Store store = order.getStore();
        String orderNumber = order.getOrderNumber();
        String storeName = store != null ? store.getName() : "Markt.ma";
        
        // Kunden-Sprache
        String customerLang = "en";
        if (order.getCustomer() != null && order.getCustomer().getPreferredLanguage() != null) {
            customerLang = order.getCustomer().getPreferredLanguage();
        }
        
        // WhatsApp: Kunde
        boolean waEnabled = store != null && store.isWhatsappNotificationsEnabled();
        if (waEnabled && order.getShippingAddress() != null) {
            String customerPhone = order.getShippingAddress().getPhone();
            if (customerPhone != null && !customerPhone.isBlank()) {
                try {
                    whatsAppService.sendOrderConfirmation(
                        customerPhone, 
                        orderNumber, 
                        storeName,
                        order.getTotalAmount().doubleValue(), 
                        customerLang
                    );
                    log.info("[WA] Order confirmation sent to customer: order={}, phone={}", orderNumber, customerPhone);
                } catch (Exception e) {
                    log.error("[WA-ERROR] Failed to send WhatsApp to customer: order={}, phone={}", orderNumber, customerPhone, e);
                }
            }
        }
        
        // WhatsApp: Händler
        if (store != null && store.getWhatsappNumber() != null && !store.getWhatsappNumber().isBlank()) {
            String ownerWhatsapp = store.getWhatsappNumber();
            String ownerLang = store.getOwner() != null && store.getOwner().getPreferredLanguage() != null 
                ? store.getOwner().getPreferredLanguage() : "en";
            String customerEmail = order.getCustomerEmail();
            
            try {
                whatsAppService.sendNewOrderToOwner(
                    ownerWhatsapp, 
                    orderNumber, 
                    storeName,
                    order.getTotalAmount().doubleValue(), 
                    customerEmail, 
                    ownerLang
                );
                log.info("[WA] New-order notification sent to owner: order={}, phone={}", orderNumber, ownerWhatsapp);
            } catch (Exception e) {
                log.error("[WA-ERROR] Failed to send WhatsApp to owner: order={}, phone={}", orderNumber, ownerWhatsapp, e);
            }
        }
        
        // Telegram: Händler
        if (store != null) {
            TelegramStoreConfig telegramCfg = telegramConfigRepository.findByStoreId(store.getId()).orElse(null);
            if (telegramCfg != null && telegramBotService.isConfigured(telegramCfg)) {
                try {
                    telegramBotService.sendNewOrderNotification(telegramCfg, order);
                    log.info("[Telegram] New-order notification sent: order={}, storeId={}", orderNumber, store.getId());
                } catch (Exception e) {
                    log.error("[Telegram-ERROR] Failed to send Telegram notification: order={}, storeId={}", 
                        orderNumber, store.getId(), e);
                }
            }
        }
    }
}
