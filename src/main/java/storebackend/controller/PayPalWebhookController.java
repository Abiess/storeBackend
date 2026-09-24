package storebackend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import storebackend.entity.PaymentTransaction;
import storebackend.entity.PaymentWebhookEvent;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentStatus;
import storebackend.payment.paypal.PayPalConfig;
import storebackend.repository.PaymentTransactionRepository;
import storebackend.repository.PaymentWebhookEventRepository;
import storebackend.service.PaymentService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * PayPal Webhook Controller
 * 
 * Empfängt und verarbeitet PayPal Webhook-Events mit:
 * - Signaturverifizierung über PayPal API
 * - Event-Deduplizierung via provider + providerEventId
 * - Idempotente Status-Updates
 * - Race-Condition-Handling zwischen Frontend-Capture und Webhook
 * 
 * WICHTIG:
 * - Webhook-Payloads werden NICHT vollständig geloggt (DSGVO, PayPal-Richtlinien)
 * - Nur technisch notwendige IDs werden extrahiert
 * - SHA-256-Hash für Audit-Trail
 * - Signatur MUSS verifiziert werden vor fachlicher Verarbeitung
 */
@RestController
@RequestMapping("/api/webhooks/paypal")
@Slf4j
@RequiredArgsConstructor
public class PayPalWebhookController {
    
    private final PayPalConfig config;
    private final PaymentWebhookEventRepository webhookEventRepo;
    private final PaymentTransactionRepository transactionRepo;
    private final PaymentService paymentService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    // NEW: OrderService für Order-Status-Updates
    private final storebackend.service.OrderService orderService;
    private final storebackend.repository.OrderRepository orderRepository;
    
    @PostMapping
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-ID", required = false) String transmissionId,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-TIME", required = false) String transmissionTime,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-SIG", required = false) String transmissionSig,
            @RequestHeader(value = "PAYPAL-CERT-URL", required = false) String certUrl,
            @RequestHeader(value = "PAYPAL-AUTH-ALGO", required = false) String authAlgo
    ) {
        try {
            // Parse Payload
            JsonNode payload = objectMapper.readTree(rawPayload);
            String eventId = payload.path("id").asText();
            String eventType = payload.path("event_type").asText();
            
            log.info("PayPal Webhook received: eventId={}, eventType={}", eventId, eventType);
            
            // 1. Deduplizierung: Bereits verarbeitet?
            Optional<PaymentWebhookEvent> existing = webhookEventRepo.findByProviderAndProviderEventId(
                PaymentProvider.PAYPAL, 
                eventId
            );
            
            if (existing.isPresent()) {
                PaymentWebhookEvent existingEvent = existing.get();
                if ("PROCESSED".equals(existingEvent.getProcessingStatus())) {
                    log.info("PayPal Webhook already processed: eventId={}, status={}", 
                        eventId, existingEvent.getProcessingStatus());
                    return ResponseEntity.ok().build();
                }
            }
            
            // 2. Event als RECEIVED speichern
            PaymentWebhookEvent webhookEvent = existing.orElseGet(() -> 
                PaymentWebhookEvent.builder()
                    .provider(PaymentProvider.PAYPAL)
                    .providerEventId(eventId)
                    .eventType(eventType)
                    .processingStatus("RECEIVED")
                    .payloadHash(calculatePayloadHash(rawPayload))
                    .receivedAt(LocalDateTime.now())
                    .build()
            );
            
            // Extrahiere Provider-IDs aus Payload
            extractProviderIds(payload, webhookEvent);
            
            webhookEvent = webhookEventRepo.save(webhookEvent);
            
            // 3. Signaturverifizierung
            if (!verifyWebhookSignature(rawPayload, transmissionId, transmissionTime, transmissionSig, certUrl, authAlgo)) {
                log.error("PayPal Webhook signature verification FAILED: eventId={}", eventId);
                webhookEvent.setProcessingStatus("FAILED");
                webhookEvent.setFailureCode("INVALID_SIGNATURE");
                webhookEvent.setFailureMessage("Webhook signature verification failed");
                webhookEventRepo.save(webhookEvent);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            log.info("PayPal Webhook signature verified: eventId={}", eventId);
            
            // 4. Status PROCESSING setzen
            webhookEvent.setProcessingStatus("PROCESSING");
            webhookEvent = webhookEventRepo.save(webhookEvent);
            
            // 5. Event verarbeiten
            processWebhookEvent(webhookEvent, payload);
            
            // 6. Status PROCESSED setzen
            webhookEvent.setProcessingStatus("PROCESSED");
            webhookEvent.setProcessedAt(LocalDateTime.now());
            webhookEventRepo.save(webhookEvent);
            
            log.info("PayPal Webhook processed successfully: eventId={}, eventType={}", eventId, eventType);
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            log.error("PayPal Webhook processing failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Verifiziert Webhook-Signatur über PayPal API
     * Siehe: https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
     */
    private boolean verifyWebhookSignature(
            String rawPayload,
            String transmissionId,
            String transmissionTime,
            String transmissionSig,
            String certUrl,
            String authAlgo
    ) {
        try {
            if (!config.isWebhookConfigured()) {
                log.warn("PayPal Webhook ID not configured - skipping signature verification");
                return false;
            }
            
            String webhookId = config.getActiveWebhookId();
            String url = config.getApiBase() + "/v1/notifications/verify-webhook-signature";
            
            // Build Verification Request
            String verificationBody = String.format(
                "{\"transmission_id\":\"%s\",\"transmission_time\":\"%s\",\"cert_url\":\"%s\"," +
                "\"auth_algo\":\"%s\",\"transmission_sig\":\"%s\",\"webhook_id\":\"%s\"," +
                "\"webhook_event\":%s}",
                transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig, webhookId, rawPayload
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + getAccessToken());
            
            HttpEntity<String> request = new HttpEntity<>(verificationBody, headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                url, 
                HttpMethod.POST, 
                request, 
                JsonNode.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String verificationStatus = response.getBody().path("verification_status").asText();
                return "SUCCESS".equals(verificationStatus);
            }
            
            return false;
            
        } catch (Exception e) {
            log.error("PayPal Webhook signature verification error", e);
            return false;
        }
    }
    
    /**
     * Extrahiert Provider-IDs aus Webhook-Payload
     */
    private void extractProviderIds(JsonNode payload, PaymentWebhookEvent webhookEvent) {
        try {
            JsonNode resource = payload.path("resource");
            
            // Provider Order ID
            String orderId = resource.path("id").asText();
            if (orderId != null && !orderId.isBlank()) {
                webhookEvent.setProviderOrderId(orderId);
            }
            
            // Provider Capture ID (bei Capture-Events)
            if (webhookEvent.getEventType().contains("CAPTURE")) {
                String captureId = resource.path("id").asText();
                if (captureId != null && !captureId.isBlank()) {
                    webhookEvent.setProviderCaptureId(captureId);
                }
            }
            
            // Bei ORDER-Events: prüfe supplementary_data
            JsonNode suppData = resource.path("supplementary_data").path("related_ids");
            String captureIdFromOrder = suppData.path("capture_id").asText();
            if (captureIdFromOrder != null && !captureIdFromOrder.isBlank()) {
                webhookEvent.setProviderCaptureId(captureIdFromOrder);
            }
            
        } catch (Exception e) {
            log.warn("Failed to extract provider IDs from webhook payload", e);
        }
    }
    
    /**
     * Verarbeitet Webhook-Event je nach Event-Typ
     */
    private void processWebhookEvent(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        String eventType = webhookEvent.getEventType();
        
        try {
            switch (eventType) {
                case "CHECKOUT.ORDER.APPROVED":
                    handleOrderApproved(webhookEvent, payload);
                    break;
                    
                case "PAYMENT.CAPTURE.COMPLETED":
                    handleCaptureCompleted(webhookEvent, payload);
                    break;
                    
                case "PAYMENT.CAPTURE.PENDING":
                    handleCapturePending(webhookEvent, payload);
                    break;
                    
                case "PAYMENT.CAPTURE.DENIED":
                    handleCaptureDenied(webhookEvent, payload);
                    break;
                    
                case "PAYMENT.CAPTURE.REVERSED":
                    handleCaptureReversed(webhookEvent, payload);
                    break;
                    
                case "PAYMENT.CAPTURE.REFUNDED":
                    handleCaptureRefunded(webhookEvent, payload);
                    break;
                    
                default:
                    log.info("PayPal Webhook event type not handled: {}", eventType);
                    webhookEvent.setProcessingStatus("IGNORED");
                    webhookEvent.setFailureCode("UNSUPPORTED_EVENT_TYPE");
            }
        } catch (Exception e) {
            log.error("Error processing webhook event: eventId={}, eventType={}", 
                webhookEvent.getProviderEventId(), eventType, e);
            webhookEvent.setProcessingStatus("FAILED");
            webhookEvent.setFailureCode("PROCESSING_ERROR");
            webhookEvent.setFailureMessage(e.getMessage() != null ? e.getMessage().substring(0, Math.min(500, e.getMessage().length())) : "Unknown error");
            throw e;
        }
    }
    
    private void handleOrderApproved(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        // ORDER.APPROVED bedeutet: Käufer hat genehmigt, aber Capture steht noch aus
        // Payment bleibt APPROVED oder PENDING_APPROVAL
        // Order bleibt PENDING_PAYMENT
        log.info("PayPal Order approved (no action needed): orderId={}", webhookEvent.getProviderOrderId());
        webhookEvent.setProcessingStatus("IGNORED");
        webhookEvent.setFailureCode("NO_ACTION_NEEDED");
    }
    
    private void handleCaptureCompleted(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        PaymentTransaction transaction = findPaymentTransaction(webhookEvent);
        if (transaction == null) {
            log.warn("PayPal Capture COMPLETED but no payment transaction found: captureId={}, orderId={}", 
                webhookEvent.getProviderCaptureId(), webhookEvent.getProviderOrderId());
            webhookEvent.setProcessingStatus("IGNORED");
            webhookEvent.setFailureCode("TRANSACTION_NOT_FOUND");
            return;
        }
        
        webhookEvent.setPaymentTransaction(transaction);
        
        // Zentrale Statusänderung über PaymentService (idempotent)
        paymentService.processProviderStatusUpdate(
            PaymentProvider.PAYPAL,
            webhookEvent.getProviderOrderId(),
            webhookEvent.getProviderCaptureId(),
            PaymentStatus.PAID
        );
        
        // ═══════════════════════════════════════════════════════════════════════════
        // KRITISCH: Order Status + E-Mail-Trigger
        // ═══════════════════════════════════════════════════════════════════════════
        // Order über PaymentTransaction finden und als PAID/CONFIRMED markieren
        // Dies löst den E-Mail-Versand aus (via OrderStatusChangedEvent)
        storebackend.entity.Order order = transaction.getOrder();
        if (order != null) {
            boolean statusChanged = orderService.confirmPaymentAndOrder(
                order, 
                webhookEvent.getProviderCaptureId()
            );
            
            if (statusChanged) {
                log.info("Order confirmed after PayPal Capture: orderId={}, orderNumber={}", 
                    order.getId(), order.getOrderNumber());
            } else {
                log.debug("Order already confirmed (idempotent): orderId={}", order.getId());
            }
        } else {
            log.warn("PaymentTransaction has no associated Order: transactionId={}", 
                transaction.getId());
        }
        
        log.info("PayPal Capture COMPLETED processed: paymentId={}, orderId={}", 
            transaction.getId(), transaction.getOrder().getId());
    }
    
    private void handleCapturePending(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        PaymentTransaction transaction = findPaymentTransaction(webhookEvent);
        if (transaction == null) {
            log.warn("PayPal Capture PENDING but no payment transaction found: captureId={}, orderId={}", 
                webhookEvent.getProviderCaptureId(), webhookEvent.getProviderOrderId());
            webhookEvent.setProcessingStatus("IGNORED");
            webhookEvent.setFailureCode("TRANSACTION_NOT_FOUND");
            return;
        }
        
        webhookEvent.setPaymentTransaction(transaction);
        
        paymentService.processProviderStatusUpdate(
            PaymentProvider.PAYPAL,
            webhookEvent.getProviderOrderId(),
            webhookEvent.getProviderCaptureId(),
            PaymentStatus.PENDING
        );
        
        log.info("PayPal Capture PENDING processed: paymentId={}", transaction.getId());
    }
    
    private void handleCaptureDenied(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        PaymentTransaction transaction = findPaymentTransaction(webhookEvent);
        if (transaction == null) {
            webhookEvent.setProcessingStatus("IGNORED");
            webhookEvent.setFailureCode("TRANSACTION_NOT_FOUND");
            return;
        }
        
        webhookEvent.setPaymentTransaction(transaction);
        
        paymentService.processProviderStatusUpdate(
            PaymentProvider.PAYPAL,
            webhookEvent.getProviderOrderId(),
            webhookEvent.getProviderCaptureId(),
            PaymentStatus.FAILED
        );
        
        // Order als fehlgeschlagen markieren
        storebackend.entity.Order order = transaction.getOrder();
        if (order != null) {
            String reason = "PayPal Capture denied/failed: " + webhookEvent.getProviderCaptureId();
            orderService.failPayment(order, reason);
            log.info("Order payment failed: orderId={}, reason={}", order.getId(), reason);
        }
        
        log.info("PayPal Capture DENIED processed: paymentId={}", transaction.getId());
    }
    
    private void handleCaptureReversed(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        PaymentTransaction transaction = findPaymentTransaction(webhookEvent);
        if (transaction == null) {
            webhookEvent.setProcessingStatus("IGNORED");
            webhookEvent.setFailureCode("TRANSACTION_NOT_FOUND");
            return;
        }
        
        webhookEvent.setPaymentTransaction(transaction);
        
        // REVERSED = Zahlung wurde rückgängig gemacht
        paymentService.processProviderStatusUpdate(
            PaymentProvider.PAYPAL,
            webhookEvent.getProviderOrderId(),
            webhookEvent.getProviderCaptureId(),
            PaymentStatus.FAILED
        );
        
        log.warn("PayPal Capture REVERSED: paymentId={}, orderId={}", 
            transaction.getId(), transaction.getOrder().getId());
    }
    
    private void handleCaptureRefunded(PaymentWebhookEvent webhookEvent, JsonNode payload) {
        PaymentTransaction transaction = findPaymentTransaction(webhookEvent);
        if (transaction == null) {
            webhookEvent.setProcessingStatus("IGNORED");
            webhookEvent.setFailureCode("TRANSACTION_NOT_FOUND");
            return;
        }
        
        webhookEvent.setPaymentTransaction(transaction);
        
        // Prüfe ob Full oder Partial Refund
        JsonNode resource = payload.path("resource");
        String refundStatus = resource.path("status").asText();
        
        PaymentStatus newStatus = "COMPLETED".equals(refundStatus) 
            ? PaymentStatus.REFUNDED 
            : PaymentStatus.PARTIALLY_REFUNDED;
        
        paymentService.processProviderStatusUpdate(
            PaymentProvider.PAYPAL,
            webhookEvent.getProviderOrderId(),
            webhookEvent.getProviderCaptureId(),
            newStatus
        );
        
        log.info("PayPal Capture REFUNDED processed: paymentId={}, status={}", 
            transaction.getId(), newStatus);
    }
    
    /**
     * Sucht PaymentTransaction nach providerCaptureId oder providerOrderId
     */
    private PaymentTransaction findPaymentTransaction(PaymentWebhookEvent webhookEvent) {
        // Bevorzugt: Suche nach Capture ID
        if (webhookEvent.getProviderCaptureId() != null && !webhookEvent.getProviderCaptureId().isBlank()) {
            Optional<PaymentTransaction> byCapture = transactionRepo.findByProviderCaptureId(
                webhookEvent.getProviderCaptureId()
            );
            if (byCapture.isPresent()) {
                return byCapture.get();
            }
        }
        
        // Fallback: Suche nach Order ID
        if (webhookEvent.getProviderOrderId() != null && !webhookEvent.getProviderOrderId().isBlank()) {
            Optional<PaymentTransaction> byOrder = transactionRepo.findByProviderOrderId(
                webhookEvent.getProviderOrderId()
            );
            if (byOrder.isPresent()) {
                return byOrder.get();
            }
        }
        
        return null;
    }
    
    /**
     * Berechnet SHA-256-Hash des Payloads für Audit-Trail
     */
    private String calculatePayloadHash(String payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Failed to calculate payload hash", e);
            return null;
        }
    }
    
    /**
     * Holt OAuth Access Token für Signaturverifizierung
     * Verwendet bestehende PayPalPaymentGateway-Logik
     */
    private String getAccessToken() {
        try {
            String url = config.getApiBase() + "/v1/oauth2/token";
            String auth = config.getClientId() + ":" + config.getClientSecret();
            String encodedAuth = java.util.Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Basic " + encodedAuth);
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            
            HttpEntity<String> request = new HttpEntity<>("grant_type=client_credentials", headers);
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, request, JsonNode.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody().path("access_token").asText();
            }
            
            throw new RuntimeException("Failed to get PayPal access token");
        } catch (Exception e) {
            log.error("Failed to get PayPal access token for webhook verification", e);
            throw new RuntimeException("OAuth failed", e);
        }
    }
}
