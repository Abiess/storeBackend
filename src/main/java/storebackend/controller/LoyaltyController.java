package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.LoyaltyAccountDTO;
import storebackend.dto.LoyaltyAdjustRequest;
import storebackend.dto.LoyaltyAdjustmentResponse;
import storebackend.dto.LoyaltyIssueCardRequest;
import storebackend.dto.LoyaltyLinkCustomerRequest;
import storebackend.dto.LoyaltyPurchaseRequest;
import storebackend.dto.LoyaltyPurchaseResponse;
import storebackend.dto.LoyaltyRedeemRequest;
import storebackend.dto.LoyaltyRegisterRequest;
import storebackend.dto.LoyaltyReplaceCardRequest;
import storebackend.entity.User;
import storebackend.service.LoyaltyService;
import storebackend.util.StoreAccessChecker;

/**
 * Loyalty Controller (Bonuspunkte-MVP)
 *
 * Endpoints:
 * - GET  /api/stores/{storeId}/loyalty/lookup?code=BONUS-0001   → Kunde + Punktestand
 * - POST /api/stores/{storeId}/loyalty/purchase                → Einkauf zuordnen (manueller Test-Flow)
 * - GET  /api/stores/{storeId}/loyalty/customers?q=...          → bestehende Store-Kunden suchen (für Registrierung)
 * - POST /api/stores/{storeId}/loyalty/register                → Code für bestehenden Kunden registrieren (MVP-Hilfsendpoint)
 * - POST /api/stores/{storeId}/loyalty/issue-card               → neue ANONYME Bonuskarte ausgeben (Laufkundschaft ohne Konto)
 * - POST /api/stores/{storeId}/loyalty/link-customer             → anonymen Account nachträglich einem Kunden zuordnen ("Kunde verknüpfen")
 * - GET  /api/stores/{storeId}/loyalty/accounts                  → alle Loyalty-Accounts des Stores ("Bonuskarten"-Übersicht)
 * - GET  /api/stores/{storeId}/loyalty/accounts/{id}/transactions → Transaktionshistorie eines Accounts (neueste zuerst)
 * - POST /api/stores/{storeId}/loyalty/identifiers/{id}/block     → Karte sperren (Account/Punkte unverändert)
 * - POST /api/stores/{storeId}/loyalty/identifiers/{id}/replace   → Karte ersetzen (alte REPLACED, neue ACTIVE, gleicher Account)
 * - POST /api/stores/{storeId}/loyalty/adjust                     → manuelle Punktekorrektur (ADJUST, Grund Pflicht)
 * - POST /api/stores/{storeId}/loyalty/redeem                     → Punkte einlösen (REDEEM, keine negative Balance)
 *
 * WICHTIG: "code" ist heute ein manuell eingegebener Testcode und wird
 * später 1:1 durch die UID einer NFC-Karte ersetzt – ohne API-Änderung.
 *
 * SECURITY: Multi-Tenant (storeId) + RBAC wie beim bestehenden PosController.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/loyalty")
@RequiredArgsConstructor
@Slf4j
public class LoyaltyController {

    private final LoyaltyService loyaltyService;
    private final StoreAccessChecker storeAccessChecker;

    @GetMapping("/lookup")
    public ResponseEntity<?> lookup(
        @PathVariable Long storeId,
        @RequestParam("code") String code,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAccountDTO account = loyaltyService.lookupByIdentifier(storeId, code);
            return ResponseEntity.ok(account);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            // Identifier existiert, ist aber BLOCKED/REPLACED - bewusst KEIN generisches 404.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.info("Loyalty lookup failed: store={}, code={}, reason={}", storeId, code, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/purchase")
    public ResponseEntity<?> purchase(
        @PathVariable Long storeId,
        @RequestBody LoyaltyPurchaseRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyPurchaseResponse response = loyaltyService.recordPurchase(
                storeId, request.getIdentifier(), request.getAmount(), null
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalStateException e) {
            // Identifier existiert, ist aber BLOCKED/REPLACED - bewusst KEIN generisches 400/404.
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty purchase failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/customers")
    public ResponseEntity<?> searchCustomers(
        @PathVariable Long storeId,
        @RequestParam(value = "q", required = false) String query,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            return ResponseEntity.ok(loyaltyService.searchStoreCustomers(storeId, query));
        } catch (RuntimeException e) {
            log.error("Loyalty customer search failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
        @PathVariable Long storeId,
        @RequestBody LoyaltyRegisterRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAccountDTO account = loyaltyService.registerIdentifier(
                storeId, request.getCustomerProfileId(), request.getIdentifier()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(account);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty registration failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/issue-card")
    public ResponseEntity<?> issueCard(
        @PathVariable Long storeId,
        @RequestBody LoyaltyIssueCardRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAccountDTO account = loyaltyService.issueAnonymousCard(storeId, request.getIdentifier());
            return ResponseEntity.status(HttpStatus.CREATED).body(account);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Anonymous loyalty card issuance failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/link-customer")
    public ResponseEntity<?> linkCustomer(
        @PathVariable Long storeId,
        @RequestBody LoyaltyLinkCustomerRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAccountDTO account = loyaltyService.linkCustomerProfile(
                storeId, request.getLoyaltyAccountId(), request.getCustomerProfileId()
            );
            return ResponseEntity.ok(account);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty customer linking failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/adjust")
    public ResponseEntity<?> adjustPoints(
        @PathVariable Long storeId,
        @RequestBody LoyaltyAdjustRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAdjustmentResponse response = loyaltyService.adjustPoints(
                storeId, request.getIdentifier(), request.getPoints(), request.getReason(), null
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty points adjustment failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/redeem")
    public ResponseEntity<?> redeemPoints(
        @PathVariable Long storeId,
        @RequestBody LoyaltyRedeemRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAdjustmentResponse response = loyaltyService.redeemPoints(
                storeId, request.getIdentifier(), request.getPoints(), null
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty points redemption failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/accounts")
    public ResponseEntity<?> listAccounts(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            return ResponseEntity.ok(loyaltyService.listAccounts(storeId));
        } catch (RuntimeException e) {
            log.error("Loyalty account listing failed: store={}, error={}", storeId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/identifiers/{identifierId}/block")
    public ResponseEntity<?> blockIdentifier(
        @PathVariable Long storeId,
        @PathVariable Long identifierId,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            loyaltyService.blockIdentifier(storeId, identifierId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty identifier blocking failed: store={}, identifierId={}, error={}",
                storeId, identifierId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/identifiers/{identifierId}/replace")
    public ResponseEntity<?> replaceIdentifier(
        @PathVariable Long storeId,
        @PathVariable Long identifierId,
        @RequestBody LoyaltyReplaceCardRequest request,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            LoyaltyAccountDTO account = loyaltyService.replaceIdentifier(
                storeId, identifierId, request.getNewIdentifier()
            );
            return ResponseEntity.ok(account);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("Loyalty identifier replacement failed: store={}, identifierId={}, error={}",
                storeId, identifierId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/accounts/{loyaltyAccountId}/transactions")
    public ResponseEntity<?> getTransactionHistory(
        @PathVariable Long storeId,
        @PathVariable Long loyaltyAccountId,
        @AuthenticationPrincipal User user
    ) {
        if (!isAuthorized(storeId, user)) {
            return unauthorizedOrForbidden(user);
        }
        try {
            return ResponseEntity.ok(loyaltyService.getTransactionHistory(storeId, loyaltyAccountId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            log.info("Loyalty transaction history failed: store={}, loyaltyAccountId={}, reason={}",
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
