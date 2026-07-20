package storebackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.*;
import storebackend.entity.Order;
import storebackend.entity.PaymentTransaction;
import storebackend.entity.User;
import storebackend.repository.OrderRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.PaymentService;

@RestController
@RequestMapping("/api/public/stores/{storeId}/checkout/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {
    
    private final PaymentService paymentService;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;
    private final JwtUtil jwtUtil;
    
    @PostMapping
    public ResponseEntity<?> createPayment(
        @PathVariable Long storeId,
        @Valid @RequestBody PaymentCreateRequest request,
        @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        try {
            validateStoreOrderAccess(storeId, request.getOrderId(), authHeader, request.getCheckoutToken());
            
            String returnUrl = request.getReturnUrl() != null 
                ? request.getReturnUrl() 
                : "https://api.markt.ma/checkout/success";
            String cancelUrl = request.getCancelUrl() != null 
                ? request.getCancelUrl() 
                : "https://api.markt.ma/checkout/cancel";
            
            PaymentTransaction transaction = paymentService.createPayment(
                request.getOrderId(), 
                request.getProvider(),
                returnUrl,
                cancelUrl
            );
            
            return ResponseEntity.ok(PaymentCreateResponse.builder()
                .paymentId(transaction.getId())
                .provider(transaction.getProvider())
                .providerOrderId(transaction.getProviderOrderId())
                .approvalUrl(transaction.getApprovalUrl())
                .status(transaction.getStatus())
                .errorCode(transaction.getFailureCode())
                .errorMessage(transaction.getFailureMessage())
                .build());
                
        } catch (storebackend.payment.paypal.PaymentConfigurationException e) {
            log.error("PayPal not configured: storeId={}", storeId);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse("PAYMENT_CONFIGURATION_MISSING", "PayPal ist nicht konfiguriert"));
        } catch (SecurityException e) {
            log.error("Payment creation access denied: storeId={}, orderId={}, error={}", 
                storeId, request.getOrderId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("ACCESS_DENIED", e.getMessage()));
        } catch (Exception e) {
            log.error("Payment creation failed: storeId={}, orderId={}", storeId, request.getOrderId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("PAYMENT_CREATION_FAILED", e.getMessage()));
        }
    }
    
    @PostMapping("/{paymentId}/capture")
    public ResponseEntity<?> capturePayment(
        @PathVariable Long storeId,
        @PathVariable Long paymentId,
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @RequestHeader(value = "X-Checkout-Token", required = false) String checkoutToken
    ) {
        try {
            PaymentTransaction transaction = paymentService.getPaymentTransaction(paymentId);
            validateStoreOrderAccess(storeId, transaction.getOrder().getId(), authHeader, checkoutToken);
            
            transaction = paymentService.capturePayment(paymentId);
            
            return ResponseEntity.ok(PaymentCaptureResponse.builder()
                .success(transaction.getStatus() == storebackend.enums.PaymentStatus.PAID)
                .status(transaction.getStatus())
                .providerCaptureId(transaction.getProviderCaptureId())
                .errorCode(transaction.getFailureCode())
                .errorMessage(transaction.getFailureMessage())
                .build());
                
        } catch (storebackend.payment.paypal.PaymentConfigurationException e) {
            log.error("PayPal not configured during capture: paymentId={}", paymentId);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse("PAYMENT_CONFIGURATION_MISSING", "PayPal ist nicht konfiguriert"));
        } catch (SecurityException e) {
            log.error("Payment capture access denied: paymentId={}", paymentId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("ACCESS_DENIED", e.getMessage()));
        } catch (Exception e) {
            log.error("Payment capture failed: paymentId={}", paymentId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("PAYMENT_CAPTURE_FAILED", e.getMessage()));
        }
    }
    
    @GetMapping("/{paymentId}/status")
    public ResponseEntity<?> getPaymentStatus(
        @PathVariable Long storeId,
        @PathVariable Long paymentId,
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @RequestHeader(value = "X-Checkout-Token", required = false) String checkoutToken
    ) {
        try {
            PaymentTransaction transaction = paymentService.getPaymentTransaction(paymentId);
            validateStoreOrderAccess(storeId, transaction.getOrder().getId(), authHeader, checkoutToken);
            
            return ResponseEntity.ok(PaymentStatusResponse.builder()
                .paymentId(transaction.getId())
                .provider(transaction.getProvider())
                .status(transaction.getStatus())
                .providerOrderId(transaction.getProviderOrderId())
                .providerCaptureId(transaction.getProviderCaptureId())
                .amount(transaction.getAmount())
                .currencyCode(transaction.getCurrencyCode())
                .build());
                
        } catch (SecurityException e) {
            log.error("Payment status access denied: paymentId={}", paymentId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("ACCESS_DENIED", e.getMessage()));
        } catch (Exception e) {
            log.error("Payment status retrieval failed: paymentId={}", paymentId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("PAYMENT_NOT_FOUND", "Payment not found"));
        }
    }
    
    private void validateStoreOrderAccess(Long storeId, Long orderId, String authHeader, String checkoutToken) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new SecurityException("Order not found"));
        
        if (!order.getStore().getId().equals(storeId)) {
            throw new SecurityException("Order does not belong to store");
        }
        
        Long userId = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String email = jwtUtil.extractEmail(token);
                if (jwtUtil.validateToken(token, email)) {
                    userId = jwtUtil.extractUserId(token);
                }
            } catch (Exception e) {
                log.warn("Invalid token during payment access check");
            }
        }
        
        if (userId != null) {
            if (order.getCustomer() != null && !order.getCustomer().getId().equals(userId)) {
                throw new SecurityException("Order does not belong to user");
            }
        } else {
            if (checkoutToken == null || checkoutToken.isBlank()) {
                throw new SecurityException("Authentication required for payment");
            }
        }
    }
}

class ErrorResponse {
    public String errorCode;
    public String message;
    
    public ErrorResponse(String errorCode, String message) {
        this.errorCode = errorCode;
        this.message = message;
    }
}
