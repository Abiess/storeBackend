package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.LoyaltyAccountDTO;
import storebackend.dto.LoyaltyIssueCardRequest;
import storebackend.dto.LoyaltyLinkCustomerRequest;
import storebackend.dto.LoyaltyPurchaseRequest;
import storebackend.dto.LoyaltyPurchaseResponse;
import storebackend.dto.LoyaltyRegisterRequest;
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
