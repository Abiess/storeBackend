package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreditAccountDTO;
import storebackend.dto.CreditChargeRequest;
import storebackend.dto.CreditPaymentRequest;
import storebackend.dto.CreditTransactionDTO;
import storebackend.entity.User;
import storebackend.service.CreditService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

/**
 * Credit Controller ("Anschreiben" / "Später bezahlen")
 *
 * Fachlich getrennt von LoyaltyController (eigener Service/eigene Entities),
 * aber bewusst UNTER dem bestehenden "/loyalty"-Pfad gemountet und mit
 * demselben Karten-/Kundencode (identifier) adressiert - KEINE neue
 * Navigation/kein eigener Menüpunkt im Frontend, siehe UX-Vorgabe.
 *
 * Endpoints:
 * - GET  /api/stores/{storeId}/loyalty/credit?code=...                    → offener Betrag zu einer Karte
 * - POST /api/stores/{storeId}/loyalty/credit/charge                      → "Später bezahlen" (CHARGE)
 * - POST /api/stores/{storeId}/loyalty/credit/payment                     → "Zahlung erfassen" (PAYMENT)
 * - GET  /api/stores/{storeId}/loyalty/credit/accounts/{id}/transactions  → Credit-Historie
 *
 * SECURITY: identische RBAC-Prüfung wie LoyaltyController (ORDER_CREATE, Multi-Tenant via storeId).
 */
@RestController
@RequestMapping("/api/stores/{storeId}/loyalty/credit")
@RequiredArgsConstructor
@Slf4j
public class CreditController {

    private final CreditService creditService;
    private final StoreAccessChecker storeAccessChecker;

    @GetMapping
    public ResponseEntity<?> getCreditInfo(
        @PathVariable Long storeId,
        @RequestParam("code") String code,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            CreditAccountDTO info = creditService.getCreditInfo(storeId, code);
            return ResponseEntity.ok(info);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            // Identifier existiert, ist aber BLOCKED/REPLACED - bewusst KEIN generisches 404.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.info("Credit info lookup failed: store={}, code={}, reason={}", storeId, code, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/charge")
    public ResponseEntity<?> charge(
        @PathVariable Long storeId,
        @RequestBody CreditChargeRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            CreditTransactionDTO response = creditService.charge(
                storeId, request.getIdentifier(), request.getAmount(), null, request.getNote()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Credit charge failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/payment")
    public ResponseEntity<?> pay(
        @PathVariable Long storeId,
        @RequestBody CreditPaymentRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            CreditTransactionDTO response = creditService.pay(
                storeId, request.getIdentifier(), request.getAmount(), request.getNote()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Credit payment failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/accounts/{loyaltyAccountId}/transactions")
    public ResponseEntity<?> getCreditHistory(
        @PathVariable Long storeId,
        @PathVariable Long loyaltyAccountId,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            List<CreditTransactionDTO> history = creditService.getCreditHistory(storeId, loyaltyAccountId);
            return ResponseEntity.ok(history);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            log.info("Credit history lookup failed: store={}, loyaltyAccountId={}, reason={}",
                storeId, loyaltyAccountId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    private boolean isAuthorized(Long storeId, User user) {
        return user != null && storeAccessChecker.hasPermission(storeId, "ORDER_CREATE");
    }

    private ResponseEntity<?> unauthorizedOrForbidden(User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied: ORDER_CREATE permission required");
    }
}
