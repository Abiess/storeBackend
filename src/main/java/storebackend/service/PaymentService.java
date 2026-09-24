package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Order;
import storebackend.entity.PaymentTransaction;
import storebackend.entity.Store;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;
import storebackend.payment.*;
import storebackend.repository.OrderRepository;
import storebackend.repository.PaymentTransactionRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {
    
    private final Map<PaymentProvider, PaymentGateway> paymentGateways;
    private final PaymentTransactionRepository transactionRepo;
    private final OrderRepository orderRepo;
    private final StoreRepository storeRepo;
    private final OrderCompletionService orderCompletionService;
    
    @Transactional
    public PaymentTransaction createPayment(Long orderId, PaymentProvider provider, String returnUrl, String cancelUrl) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        
        if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.PROCESSING) {
            PaymentTransaction existing = transactionRepo.findFirstByOrderIdAndProviderOrderByCreatedAtDesc(orderId, provider)
                .orElse(null);
            if (existing != null && existing.getStatus() == PaymentStatus.PAID) {
                throw new RuntimeException("Order already paid");
            }
        }
        
        Store store = order.getStore();
        BigDecimal amount = order.getTotalGross();
        String currency = order.getCurrencyCode().name();
        
        int attemptCount = transactionRepo.findByOrderIdOrderByCreatedAtDesc(orderId).size();
        String idempotencyKey = String.format("create:%d:%d:%d", store.getId(), orderId, attemptCount + 1);
        
        PaymentTransaction existingByKey = transactionRepo.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existingByKey != null) {
            log.info("Payment creation idempotent return for key: {}", idempotencyKey);
            return existingByKey;
        }
        
        PaymentGateway gateway = paymentGateways.get(provider);
        if (gateway == null) {
            throw new RuntimeException("Payment provider not supported: " + provider);
        }
        
        PaymentContext context = PaymentContext.builder()
            .storeId(store.getId())
            .orderId(orderId)
            .amount(amount)
            .currencyCode(currency)
            .returnUrl(returnUrl)
            .cancelUrl(cancelUrl)
            .idempotencyKey(idempotencyKey)
            .storeName(store.getName())
            .orderDescription("Order #" + order.getOrderNumber())
            .build();
        
        PaymentCreateResult result = gateway.createPayment(context);
        
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setStore(store);
        transaction.setOrder(order);
        transaction.setProvider(provider);
        transaction.setAmount(amount);
        transaction.setCurrencyCode(currency);
        transaction.setIdempotencyKey(idempotencyKey);
        
        if (result.isSuccess()) {
            transaction.setStatus(PaymentStatus.PENDING_APPROVAL);
            transaction.setProviderOrderId(result.getProviderOrderId());
            transaction.setApprovalUrl(result.getApprovalUrl());
            log.info("Payment created: provider={}, providerOrderId={}, orderId={}", 
                provider, result.getProviderOrderId(), orderId);
        } else {
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureCode(result.getErrorCode());
            transaction.setFailureMessage(result.getErrorMessage());
            log.error("Payment creation failed: provider={}, orderId={}, error={}", 
                provider, orderId, result.getErrorCode());
        }
        
        transaction = transactionRepo.save(transaction);
        
        if (result.isSuccess() && order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.PENDING_PAYMENT);
            orderRepo.save(order);
        }
        
        return transaction;
    }
    
    @Transactional
    public PaymentTransaction capturePayment(Long paymentId) {
        PaymentTransaction transaction = transactionRepo.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Payment transaction not found: " + paymentId));
        
        if (transaction.getStatus() == PaymentStatus.PAID) {
            log.info("Payment already captured (idempotent): paymentId={}", paymentId);
            return transaction;
        }
        
        if (transaction.getStatus() != PaymentStatus.PENDING_APPROVAL && transaction.getStatus() != PaymentStatus.APPROVED) {
            throw new RuntimeException("Payment not in capturable state: " + transaction.getStatus());
        }
        
        Order order = transaction.getOrder();
        
        BigDecimal expectedAmount = order.getTotalGross();
        String expectedCurrency = order.getCurrencyCode().name();
        
        if (transaction.getAmount().compareTo(expectedAmount) != 0) {
            log.error("Payment amount mismatch: transaction={}, order={}", transaction.getAmount(), expectedAmount);
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureCode("PAYMENT_AMOUNT_MISMATCH");
            transaction.setFailureMessage("Amount mismatch");
            return transactionRepo.save(transaction);
        }
        
        if (!transaction.getCurrencyCode().equals(expectedCurrency)) {
            log.error("Payment currency mismatch: transaction={}, order={}", transaction.getCurrencyCode(), expectedCurrency);
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureCode("PAYMENT_CURRENCY_MISMATCH");
            transaction.setFailureMessage("Currency mismatch");
            return transactionRepo.save(transaction);
        }
        
        String idempotencyKey = String.format("capture:%d:%s", paymentId, transaction.getProviderOrderId());
        
        PaymentGateway gateway = paymentGateways.get(transaction.getProvider());
        if (gateway == null) {
            throw new RuntimeException("Payment provider not supported: " + transaction.getProvider());
        }
        
        PaymentCaptureCommand command = PaymentCaptureCommand.builder()
            .providerOrderId(transaction.getProviderOrderId())
            .idempotencyKey(idempotencyKey)
            .storeId(transaction.getStore().getId())
            .build();
        
        PaymentCaptureResult result = gateway.capturePayment(command);
        
        if (result.isSuccess() && result.getStatus() == PaymentStatus.PAID) {
            log.info("[CAPTURE] PayPal capture successful: paymentId={}, captureId={}, orderId={}", 
                paymentId, result.getProviderCaptureId(), order.getId());
            
            // 1. Payment-Status aktualisieren
            transaction.setStatus(PaymentStatus.PAID);
            transaction.setProviderCaptureId(result.getProviderCaptureId());
            transaction.setPaidAt(LocalDateTime.now());
            transactionRepo.save(transaction);
            
            // 2. Order-Status auf CONFIRMED + PaymentStatus auf PAID setzen
            order.setStatus(OrderStatus.CONFIRMED);
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepo.save(order);
            
            log.info("[CAPTURE] Order status updated: orderId={}, status=CONFIRMED, paymentStatus=PAID", order.getId());
            
            // 3. ZENTRALE Order-Completion aufrufen (idempotent!)
            //    → Bestand reduzieren (wenn noch nicht geschehen)
            //    → E-Mails senden (wenn noch nicht geschehen)
            //    → Benachrichtigungen senden
            try {
                orderCompletionService.completePaidOrder(order.getId());
            } catch (Exception e) {
                log.error("[CAPTURE-ERROR] Order completion failed: orderId={}, error={}", order.getId(), e.getMessage(), e);
                // NICHT durchschlagen - Payment wurde bereits erfasst
                // Completion kann später manuell oder via Webhook wiederholt werden
            }
            
        } else if (result.getStatus() == PaymentStatus.PENDING) {
            transaction.setStatus(PaymentStatus.PENDING);
            transaction.setProviderCaptureId(result.getProviderCaptureId());
            
            log.warn("Payment capture pending: paymentId={}, orderId={}", paymentId, order.getId());
        } else {
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureCode(result.getErrorCode());
            transaction.setFailureMessage(result.getErrorMessage());
            
            log.error("Payment capture failed: paymentId={}, error={}", paymentId, result.getErrorCode());
        }
        
        return transactionRepo.save(transaction);
    }
    
    public PaymentTransaction getPaymentTransaction(Long paymentId) {
        return transactionRepo.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Payment transaction not found: " + paymentId));
    }
    
    public List<PaymentTransaction> getOrderPayments(Long orderId) {
        return transactionRepo.findByOrderIdOrderByCreatedAtDesc(orderId);
    }
    
    @Transactional
    public void updatePaymentStatus(Long paymentId, PaymentStatus newStatus) {
        PaymentTransaction transaction = transactionRepo.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Payment transaction not found: " + paymentId));
        
        PaymentStatus oldStatus = transaction.getStatus();
        
        if (!isValidStatusTransition(oldStatus, newStatus)) {
            log.error("Invalid payment status transition: {} -> {}", oldStatus, newStatus);
            throw new RuntimeException("Invalid status transition: " + oldStatus + " -> " + newStatus);
        }
        
        transaction.setStatus(newStatus);
        
        if (newStatus == PaymentStatus.PAID && oldStatus != PaymentStatus.PAID) {
            transaction.setPaidAt(LocalDateTime.now());
            
            Order order = transaction.getOrder();
            if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
                order.setStatus(OrderStatus.CONFIRMED);
                order.setUpdatedAt(LocalDateTime.now());
                orderRepo.save(order);
            }
        }
        
        transactionRepo.save(transaction);
        log.info("Payment status updated: paymentId={}, {} -> {}", paymentId, oldStatus, newStatus);
    }
    
    private boolean isValidStatusTransition(PaymentStatus from, PaymentStatus to) {
        return switch (from) {
            case CREATED -> to == PaymentStatus.PENDING_APPROVAL || to == PaymentStatus.FAILED || to == PaymentStatus.CANCELLED;
            case PENDING_APPROVAL -> to == PaymentStatus.APPROVED || to == PaymentStatus.CANCELLED || to == PaymentStatus.FAILED;
            case APPROVED -> to == PaymentStatus.PENDING || to == PaymentStatus.PAID || to == PaymentStatus.FAILED;
            case PENDING -> to == PaymentStatus.PAID || to == PaymentStatus.FAILED;
            case PAID -> to == PaymentStatus.PARTIALLY_REFUNDED || to == PaymentStatus.REFUNDED;
            case PARTIALLY_REFUNDED -> to == PaymentStatus.REFUNDED;
            case FAILED, CANCELLED, REFUNDED -> false;
        };
    }
    
    /**
     * Zentrale Methode für Provider-Status-Updates (z.B. durch Webhooks)
     * 
     * IDEMPOTENT: Mehrfacher Aufruf mit gleichem Status ändert nichts
     * RACE-SAFE: Capture und Webhook können gleichzeitig ankommen
     * 
     * @param provider Payment Provider (PAYPAL, etc.)
     * @param providerOrderId Provider Order ID
     * @param providerCaptureId Provider Capture ID (optional)
     * @param newStatus Neuer PaymentStatus
     */
    @Transactional
    public void processProviderStatusUpdate(
            PaymentProvider provider,
            String providerOrderId,
            String providerCaptureId,
            PaymentStatus newStatus
    ) {
        // 1. Transaction finden (bevorzugt nach Capture ID, fallback Order ID)
        PaymentTransaction transaction = null;
        
        if (providerCaptureId != null && !providerCaptureId.isBlank()) {
            transaction = transactionRepo.findByProviderCaptureId(providerCaptureId).orElse(null);
        }
        
        if (transaction == null && providerOrderId != null && !providerOrderId.isBlank()) {
            transaction = transactionRepo.findByProviderOrderId(providerOrderId).orElse(null);
        }
        
        if (transaction == null) {
            log.warn("No payment transaction found for providerOrderId={}, providerCaptureId={}", 
                providerOrderId, providerCaptureId);
            return;
        }
        
        PaymentStatus oldStatus = transaction.getStatus();
        
        // 2. Idempotenz: Bereits im Zielstatus?
        if (oldStatus == newStatus) {
            log.info("Payment already in target status (idempotent): paymentId={}, status={}", 
                transaction.getId(), newStatus);
            return;
        }
        
        // 3. Status-Update je nach neuem Status
        switch (newStatus) {
            case PAID:
                handleProviderStatusPaid(transaction, providerCaptureId);
                break;
                
            case PENDING:
                handleProviderStatusPending(transaction);
                break;
                
            case FAILED:
                handleProviderStatusFailed(transaction);
                break;
                
            case REFUNDED:
            case PARTIALLY_REFUNDED:
                handleProviderStatusRefunded(transaction, newStatus);
                break;
                
            default:
                log.warn("Unsupported provider status update: paymentId={}, newStatus={}", 
                    transaction.getId(), newStatus);
        }
        
        log.info("Provider status update processed: paymentId={}, {} -> {}", 
            transaction.getId(), oldStatus, newStatus);
    }
    
    private void handleProviderStatusPaid(PaymentTransaction transaction, String providerCaptureId) {
        PaymentStatus oldStatus = transaction.getStatus();
        
        // Idempotenz: Bereits PAID?
        if (oldStatus == PaymentStatus.PAID) {
            return;
        }
        
        log.info("[WEBHOOK] Processing PAID status: paymentId={}, orderId={}", 
            transaction.getId(), transaction.getOrder().getId());
        
        // Status-Update
        transaction.setStatus(PaymentStatus.PAID);
        transaction.setPaidAt(LocalDateTime.now());
        
        // Capture ID setzen falls noch nicht vorhanden
        if (providerCaptureId != null && !providerCaptureId.isBlank()) {
            transaction.setProviderCaptureId(providerCaptureId);
        }
        
        transactionRepo.save(transaction);
        
        // Order bestätigen
        Order order = transaction.getOrder();
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            order.setStatus(OrderStatus.CONFIRMED);
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepo.save(order);
        }
        
        log.info("[WEBHOOK] Order status updated: orderId={}, status=CONFIRMED, paymentStatus=PAID", order.getId());
        
        // ZENTRALE Order-Completion aufrufen (idempotent!)
        try {
            orderCompletionService.completePaidOrder(order.getId());
        } catch (Exception e) {
            log.error("[WEBHOOK-ERROR] Order completion failed: orderId={}, error={}", order.getId(), e.getMessage(), e);
            // NICHT durchschlagen - Payment wurde bereits erfasst
        }
    }
    
    private void handleProviderStatusPending(PaymentTransaction transaction) {
        if (transaction.getStatus() == PaymentStatus.PENDING) {
            return;
        }
        
        transaction.setStatus(PaymentStatus.PENDING);
        transactionRepo.save(transaction);
        
        // Order bleibt PENDING_PAYMENT
        log.info("Payment PENDING: orderId={}, paymentId={}", 
            transaction.getOrder().getId(), transaction.getId());
    }
    
    private void handleProviderStatusFailed(PaymentTransaction transaction) {
        if (transaction.getStatus() == PaymentStatus.FAILED) {
            return;
        }
        
        transaction.setStatus(PaymentStatus.FAILED);
        transactionRepo.save(transaction);
        
        // Order bleibt PENDING_PAYMENT (User kann andere Zahlungsart wählen)
        log.warn("Payment FAILED: orderId={}, paymentId={}", 
            transaction.getOrder().getId(), transaction.getId());
    }
    
    private void handleProviderStatusRefunded(PaymentTransaction transaction, PaymentStatus newStatus) {
        PaymentStatus oldStatus = transaction.getStatus();
        
        // Nur von PAID zu REFUNDED/PARTIALLY_REFUNDED
        if (oldStatus != PaymentStatus.PAID && oldStatus != PaymentStatus.PARTIALLY_REFUNDED) {
            log.warn("Cannot refund payment not in PAID status: paymentId={}, currentStatus={}", 
                transaction.getId(), oldStatus);
            return;
        }
        
        transaction.setStatus(newStatus);
        transactionRepo.save(transaction);
        
        // Order-Status anpassen
        Order order = transaction.getOrder();
        if (newStatus == PaymentStatus.REFUNDED) {
            // TODO: Order-Status für Full Refund (z.B. CANCELLED oder REFUNDED)
            log.warn("Payment REFUNDED: orderId={}, paymentId={}", order.getId(), transaction.getId());
        } else {
            // PARTIALLY_REFUNDED
            log.info("Payment PARTIALLY_REFUNDED: orderId={}, paymentId={}", order.getId(), transaction.getId());
        }
    }
}

