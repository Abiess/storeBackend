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
            transaction.setStatus(PaymentStatus.PAID);
            transaction.setProviderCaptureId(result.getProviderCaptureId());
            transaction.setPaidAt(LocalDateTime.now());
            
            order.setStatus(OrderStatus.CONFIRMED);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepo.save(order);
            
            log.info("Payment captured successfully: paymentId={}, captureId={}, orderId={}", 
                paymentId, result.getProviderCaptureId(), order.getId());
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
}
