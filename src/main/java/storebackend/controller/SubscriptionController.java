package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.UpgradeRequest;
import storebackend.dto.PaymentIntentResponse;
import storebackend.dto.PlanDetails;
import storebackend.entity.Subscription;
import storebackend.enums.PaymentMethod;
import storebackend.service.SubscriptionService;

import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    /**
     * Hole alle verfügbaren Subscription-Pläne
     */
    @GetMapping("/plans")
    public ResponseEntity<List<PlanDetails>> getAvailablePlans() {
        log.info("GET /api/subscriptions/plans");

        List<PlanDetails> plans = Arrays.asList(
            PlanDetails.builder()
                .plan("FREE")
                .name("Free")
                .description("Perfekt für den Start")
                .monthlyPrice(0.0)
                .yearlyPrice(0.0)
                .popular(false)
                .features(Map.of(
                    "maxStores", 1,
                    "maxProducts", 10,
                    "maxOrders", 50,
                    "customDomain", false,
                    "analytics", false,
                    "priority_support", false,
                    "api_access", false,
                    "multiLanguage", false,
                    "customBranding", false
                ))
                .build(),

            PlanDetails.builder()
                .plan("PRO")
                .name("Pro")
                .description("Für wachsende Unternehmen")
                .monthlyPrice(29.99)
                .yearlyPrice(299.99)
                .popular(true)
                .features(Map.of(
                    "maxStores", 3,
                    "maxProducts", 1000,
                    "maxOrders", -1,
                    "customDomain", true,
                    "analytics", true,
                    "priority_support", true,
                    "api_access", true,
                    "multiLanguage", true,
                    "customBranding", false
                ))
                .build(),

            PlanDetails.builder()
                .plan("ENTERPRISE")
                .name("Enterprise")
                .description("Für große Unternehmen")
                .monthlyPrice(99.99)
                .yearlyPrice(999.99)
                .popular(false)
                .features(Map.of(
                    "maxStores", -1,
                    "maxProducts", -1,
                    "maxOrders", -1,
                    "customDomain", true,
                    "analytics", true,
                    "priority_support", true,
                    "api_access", true,
                    "multiLanguage", true,
                    "customBranding", true
                ))
                .build()
        );

        return ResponseEntity.ok(plans);
    }

    /**
     * Hole aktuelle Subscription eines Benutzers
     */
    @GetMapping("/user/{userId}/current")
    public ResponseEntity<Subscription> getCurrentSubscription(@PathVariable Long userId) {
        log.info("GET /api/subscriptions/user/{}/current", userId);

        return subscriptionService.getCurrentSubscription(userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Hole Subscription-Historie
     */
    @GetMapping("/user/{userId}/history")
    public ResponseEntity<List<Subscription>> getSubscriptionHistory(@PathVariable Long userId) {
        log.info("GET /api/subscriptions/user/{}/history", userId);

        List<Subscription> history = subscriptionService.getSubscriptionHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * Plan upgraden
     */
    @PostMapping("/upgrade")
    public ResponseEntity<PaymentIntentResponse> upgradePlan(@RequestBody UpgradeRequest request) {
        log.info("POST /api/subscriptions/upgrade: {}", request);

        try {
            Subscription subscription = subscriptionService.upgradePlan(
                request.getUserId(),
                request.getTargetPlan(),
                request.getBillingCycle(),
                request.getPaymentMethod()
            );

            // Erstelle Payment Intent Response
            PaymentIntentResponse response = new PaymentIntentResponse();
            response.setId("pi_" + UUID.randomUUID().toString());
            response.setAmount(subscription.getAmount());
            response.setCurrency("EUR");
            response.setStatus(subscription.getStatus().toString().toLowerCase());
            response.setPaymentMethod(request.getPaymentMethod());

            // Füge Bank-Überweisungsdetails hinzu, falls benötigt
            if (request.getPaymentMethod() == PaymentMethod.BANK_TRANSFER) {
                PaymentIntentResponse.BankTransferDetails bankDetails = new PaymentIntentResponse.BankTransferDetails();
                bankDetails.setAccountHolder("markt.ma GmbH");
                bankDetails.setIban("DE89 3704 0044 0532 0130 00");
                bankDetails.setBic("COBADEFFXXX");
                bankDetails.setReference("SUB-" + subscription.getId() + "-" + System.currentTimeMillis());
                bankDetails.setAmount(subscription.getAmount());
                bankDetails.setCurrency("EUR");

                response.setBankTransferDetails(bankDetails);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Fehler beim Plan-Upgrade", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Subscription kündigen
     */
    @PostMapping("/{subscriptionId}/cancel")
    public ResponseEntity<Void> cancelSubscription(@PathVariable Long subscriptionId) {
        log.info("POST /api/subscriptions/{}/cancel", subscriptionId);

        try {
            subscriptionService.cancelSubscription(subscriptionId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Fehler beim Kündigen der Subscription", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Subscription reaktivieren
     */
    @PostMapping("/{subscriptionId}/reactivate")
    public ResponseEntity<Subscription> reactivateSubscription(@PathVariable Long subscriptionId) {
        log.info("POST /api/subscriptions/{}/reactivate", subscriptionId);

        try {
            Subscription subscription = subscriptionService.reactivateSubscription(subscriptionId);
            return ResponseEntity.ok(subscription);
        } catch (Exception e) {
            log.error("Fehler beim Reaktivieren der Subscription", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Zahlungsmethode aktualisieren
     */
    @PutMapping("/{subscriptionId}/payment-method")
    public ResponseEntity<Subscription> updatePaymentMethod(
            @PathVariable Long subscriptionId,
            @RequestBody PaymentMethodRequest request) {
        log.info("PUT /api/subscriptions/{}/payment-method: {}", subscriptionId, request.getPaymentMethod());

        try {
            Subscription subscription = subscriptionService.updatePaymentMethod(
                subscriptionId,
                request.getPaymentMethod()
            );
            return ResponseEntity.ok(subscription);
        } catch (Exception e) {
            log.error("Fehler beim Aktualisieren der Zahlungsmethode", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Zahlung bestätigen (für Bank-Überweisungen)
     */
    @PostMapping("/{subscriptionId}/confirm-payment")
    public ResponseEntity<Subscription> confirmPayment(@PathVariable Long subscriptionId) {
        log.info("POST /api/subscriptions/{}/confirm-payment", subscriptionId);

        try {
            Subscription subscription = subscriptionService.confirmPayment(subscriptionId);
            return ResponseEntity.ok(subscription);
        } catch (Exception e) {
            log.error("Fehler beim Bestätigen der Zahlung", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Inner class für Payment Method Request
    public static class PaymentMethodRequest {
        private PaymentMethod paymentMethod;

        public PaymentMethod getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(PaymentMethod paymentMethod) {
            this.paymentMethod = paymentMethod;
        }
    }
}
