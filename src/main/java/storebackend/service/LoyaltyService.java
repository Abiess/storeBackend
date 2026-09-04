package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.LoyaltyAccountDTO;
import storebackend.dto.LoyaltyAccountListItemDTO;
import storebackend.dto.LoyaltyAdjustmentResponse;
import storebackend.dto.LoyaltyCustomerOptionDTO;
import storebackend.dto.LoyaltyPurchaseResponse;
import storebackend.dto.LoyaltyTransactionDTO;
import storebackend.entity.*;
import storebackend.enums.LoyaltyIdentifierStatus;
import storebackend.enums.LoyaltyTransactionType;
import storebackend.repository.CustomerCreditAccountRepository;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.LoyaltyAccountRepository;
import storebackend.repository.LoyaltyIdentifierRepository;
import storebackend.repository.LoyaltyTransactionRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Loyalty Service (Bonuspunkte-MVP)
 *
 * Zentrale Logik für das Loyalty-/Bonuspunkte-System. Wird sowohl vom
 * manuellen Test-Flow (LoyaltyController) als auch vom bestehenden
 * Kaufprozess (aktuell: PosOrderService) aufgerufen.
 *
 * WICHTIG:
 * - Die Karte/der Code speichert selbst KEINE Punkte, sondern identifiziert
 *   nur den LoyaltyAccount (siehe LoyaltyIdentifier).
 * - Punkteänderungen erfolgen AUSSCHLIESSLICH über recordPurchase()/adjust(),
 *   die immer eine LoyaltyTransaction anlegen (Audit-Trail).
 * - Die Berechnung ist bewusst währungsunabhängig (amountStep/pointsPerStep),
 *   damit sie für jede Store-Währung (EUR, MAD, USD, ...) funktioniert.
 * - "identifier" ist so generisch gehalten, dass er später 1:1 durch eine
 *   NFC-Karten-UID ersetzt werden kann, ohne dass sich an dieser Klasse
 *   irgendetwas ändern muss.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final LoyaltyIdentifierRepository loyaltyIdentifierRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StoreRepository storeRepository;
    private final CustomerCreditAccountRepository customerCreditAccountRepository;

    /**
     * Sucht einen LoyaltyAccount anhand des Karten-/Kundencodes.
     *
     * @param storeId    Store ID (Multi-Tenant)
     * @param identifier Karten-/Kundencode
     * @return LoyaltyAccountDTO mit Kundendaten + aktuellem Punktestand
     * @throws RuntimeException wenn Code nicht existiert, gesperrt ist oder Loyalty deaktiviert ist
     */
    @Transactional(readOnly = true)
    public LoyaltyAccountDTO lookupByIdentifier(Long storeId, String identifier) {
        Store store = loadStore(storeId);
        assertLoyaltyEnabled(store);

        LoyaltyIdentifier code = findActiveIdentifier(storeId, identifier);
        LoyaltyAccount account = code.getLoyaltyAccount();

        return toAccountDTO(account, store);
    }

    /**
     * Registriert einen neuen Karten-/Kundencode für ein bestehendes CustomerProfile.
     * Legt bei Bedarf den LoyaltyAccount an (1 Account pro Kunde+Store).
     *
     * MVP-Hilfsmethode: Ohne diese Registrierung gäbe es keinen Code zum Testen.
     * Später kann dieselbe Methode verwendet werden, um eine echte NFC-UID
     * mit einem Kunden zu verknüpfen.
     *
     * @param storeId          Store ID
     * @param customerProfileId bestehendes CustomerProfile (MUSS zum Store gehören)
     * @param identifier       eindeutiger Code (z.B. "BONUS-0001", später NFC-UID)
     * @return LoyaltyAccountDTO des (neuen oder bestehenden) Accounts
     */
    @Transactional
    public LoyaltyAccountDTO registerIdentifier(Long storeId, Long customerProfileId, String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("identifier must not be empty");
        }
        String normalizedIdentifier = identifier.trim();

        Store store = loadStore(storeId);

        CustomerProfile customerProfile = customerProfileRepository.findById(customerProfileId)
            .orElseThrow(() -> new RuntimeException("Customer profile not found: " + customerProfileId));

        if (customerProfile.getStore() == null || !customerProfile.getStore().getId().equals(storeId)) {
            throw new SecurityException("Customer profile " + customerProfileId + " does not belong to store " + storeId);
        }

        if (loyaltyIdentifierRepository.existsByStoreIdAndIdentifier(storeId, normalizedIdentifier)) {
            throw new RuntimeException("Identifier already registered: " + normalizedIdentifier);
        }

        LoyaltyAccount account = loyaltyAccountRepository
            .findByStoreIdAndCustomerProfileId(storeId, customerProfileId)
            .orElseGet(() -> {
                LoyaltyAccount newAccount = new LoyaltyAccount();
                newAccount.setStore(store);
                newAccount.setCustomerProfile(customerProfile);
                newAccount.setPointsBalance(0);
                newAccount.setLifetimePoints(0);
                return loyaltyAccountRepository.save(newAccount);
            });

        LoyaltyIdentifier newIdentifier = new LoyaltyIdentifier();
        newIdentifier.setStore(store);
        newIdentifier.setLoyaltyAccount(account);
        newIdentifier.setIdentifier(normalizedIdentifier);
        newIdentifier.setStatus(LoyaltyIdentifierStatus.ACTIVE);
        loyaltyIdentifierRepository.save(newIdentifier);

        log.info("Loyalty identifier registered: store={}, customerProfile={}, identifier={}",
            storeId, customerProfileId, normalizedIdentifier);

        return toAccountDTO(account, store);
    }

    /**
     * Gibt eine neue anonyme Bonuskarte aus (Laufkundschaft ohne Konto).
     *
     * Legt einen LoyaltyAccount OHNE CustomerProfile an und verknüpft ihn
     * sofort mit dem übergebenen Code. Punktestand startet bei 0. Die Karte
     * ist danach sofort nutzbar (z.B. für den aktuellen POS-Einkauf).
     *
     * @param storeId    Store ID
     * @param identifier eindeutiger Code (Scan oder manuelle Eingabe)
     * @return LoyaltyAccountDTO des neuen anonymen Accounts (anonymous=true)
     */
    @Transactional
    public LoyaltyAccountDTO issueAnonymousCard(Long storeId, String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("identifier must not be empty");
        }
        String normalizedIdentifier = identifier.trim();

        Store store = loadStore(storeId);
        assertLoyaltyEnabled(store);

        if (loyaltyIdentifierRepository.existsByStoreIdAndIdentifier(storeId, normalizedIdentifier)) {
            throw new RuntimeException("Identifier already registered: " + normalizedIdentifier);
        }

        LoyaltyAccount account = new LoyaltyAccount();
        account.setStore(store);
        account.setCustomerProfile(null);
        account.setPointsBalance(0);
        account.setLifetimePoints(0);
        account = loyaltyAccountRepository.save(account);

        LoyaltyIdentifier newIdentifier = new LoyaltyIdentifier();
        newIdentifier.setStore(store);
        newIdentifier.setLoyaltyAccount(account);
        newIdentifier.setIdentifier(normalizedIdentifier);
        newIdentifier.setStatus(LoyaltyIdentifierStatus.ACTIVE);
        loyaltyIdentifierRepository.save(newIdentifier);

        log.info("Anonymous loyalty card issued: store={}, loyaltyAccount={}, identifier={}",
            storeId, account.getId(), normalizedIdentifier);

        return toAccountDTO(account, store);
    }

    /**
     * Verknüpft einen bestehenden (bisher anonymen) LoyaltyAccount nachträglich
     * mit einem CustomerProfile ("Kunde verknüpfen"). Die Punkte bleiben
     * erhalten, da derselbe Account (dieselbe Zeile) wiederverwendet wird -
     * es wird KEIN neuer Account angelegt und keine Punkte übertragen.
     *
     * @param storeId           Store ID
     * @param loyaltyAccountId  bestehender, bisher anonymer LoyaltyAccount
     * @param customerProfileId Ziel-CustomerProfile (MUSS zum Store gehören)
     * @return aktualisiertes LoyaltyAccountDTO (anonymous=false)
     */
    @Transactional
    public LoyaltyAccountDTO linkCustomerProfile(Long storeId, Long loyaltyAccountId, Long customerProfileId) {
        if (loyaltyAccountId == null || customerProfileId == null) {
            throw new IllegalArgumentException("loyaltyAccountId and customerProfileId must not be empty");
        }

        Store store = loadStore(storeId);

        LoyaltyAccount account = loyaltyAccountRepository.findById(loyaltyAccountId)
            .orElseThrow(() -> new RuntimeException("Loyalty account not found: " + loyaltyAccountId));

        if (account.getStore() == null || !account.getStore().getId().equals(storeId)) {
            throw new SecurityException("Loyalty account " + loyaltyAccountId + " does not belong to store " + storeId);
        }

        if (account.getCustomerProfile() != null) {
            throw new RuntimeException("Loyalty account is already linked to a customer");
        }

        CustomerProfile customerProfile = customerProfileRepository.findById(customerProfileId)
            .orElseThrow(() -> new RuntimeException("Customer profile not found: " + customerProfileId));

        if (customerProfile.getStore() == null || !customerProfile.getStore().getId().equals(storeId)) {
            throw new SecurityException("Customer profile " + customerProfileId + " does not belong to store " + storeId);
        }

        if (loyaltyAccountRepository.findByStoreIdAndCustomerProfileId(storeId, customerProfileId).isPresent()) {
            throw new RuntimeException("Customer already has a loyalty account for this store");
        }

        account.setCustomerProfile(customerProfile);
        loyaltyAccountRepository.save(account);

        log.info("Loyalty account linked to customer: store={}, loyaltyAccount={}, customerProfile={}",
            storeId, loyaltyAccountId, customerProfileId);

        return toAccountDTO(account, store);
    }

    /**
     * Ordnet einen Einkauf einem Loyalty Account zu, berechnet die Punkte
     * anhand der Store-Konfiguration und legt eine EARN-Transaction an.
     *
     * Wird sowohl vom manuellen Test-Endpunkt als auch vom bestehenden
     * Kaufprozess (z.B. PosOrderService) aufgerufen.
     *
     * @param storeId    Store ID
     * @param identifier Karten-/Kundencode
     * @param amount     Einkaufswert (in Store-Währung, KEINE feste Währung annehmen!)
     * @param order      bestehende Order-Referenz, falls vorhanden (kann null sein)
     * @return LoyaltyPurchaseResponse mit altem/neuem Punktestand
     */
    @Transactional
    public LoyaltyPurchaseResponse recordPurchase(Long storeId, String identifier, BigDecimal amount, Order order) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("amount must be zero or positive");
        }

        Store store = loadStore(storeId);
        assertLoyaltyEnabled(store);

        LoyaltyIdentifier code = findActiveIdentifier(storeId, identifier);
        LoyaltyAccount account = code.getLoyaltyAccount();

        BigDecimal minimumPurchase = store.getLoyaltyMinimumPurchase();
        int pointsEarned;
        if (minimumPurchase != null && amount.compareTo(minimumPurchase) < 0) {
            // Unter Mindest-Einkaufswert → keine Punkte, aber kein Fehler
            pointsEarned = 0;
        } else {
            pointsEarned = calculatePoints(amount, store);
        }

        int previousBalance = account.getPointsBalance() != null ? account.getPointsBalance() : 0;
        int newBalance = previousBalance + pointsEarned;

        account.setPointsBalance(newBalance);
        if (pointsEarned > 0) {
            int previousLifetime = account.getLifetimePoints() != null ? account.getLifetimePoints() : 0;
            account.setLifetimePoints(previousLifetime + pointsEarned);
        }
        loyaltyAccountRepository.save(account);

        LoyaltyTransaction transaction = new LoyaltyTransaction();
        transaction.setLoyaltyAccount(account);
        transaction.setStore(store);
        transaction.setOrder(order);
        transaction.setType(LoyaltyTransactionType.EARN);
        transaction.setPoints(pointsEarned);
        transaction.setAmount(amount);
        transaction.setResultingBalance(newBalance);
        loyaltyTransactionRepository.save(transaction);

        log.info("Loyalty purchase recorded: store={}, identifier={}, amount={}, pointsEarned={}, newBalance={}",
            storeId, identifier, amount, pointsEarned, newBalance);

        LoyaltyPurchaseResponse response = new LoyaltyPurchaseResponse();
        response.setLoyaltyAccountId(account.getId());
        response.setCustomerName(resolveCustomerName(account.getCustomerProfile()));
        response.setAmount(amount);
        response.setPointsEarned(pointsEarned);
        response.setPreviousBalance(previousBalance);
        response.setNewBalance(newBalance);
        response.setCurrencyCode(store.getCurrencyCode() != null ? store.getCurrencyCode().name() : null);
        return response;
    }

    /**
     * Manuelle Punktekorrektur ("Punkte korrigieren").
     *
     * points kann positiv (Bonus/Kulanz) oder negativ (Abzug/Korrektur) sein.
     * reason ist Pflichtfeld und wird als Note in der LoyaltyTransaction
     * gespeichert (Audit-Trail). pointsBalance wird AUSSCHLIESSLICH über diese
     * Methode (bzw. recordPurchase/redeemPoints) verändert, nie direkt.
     *
     * @param storeId    Store ID
     * @param identifier Karten-/Kundencode (muss ein aktiver Identifier sein)
     * @param points     Punkteänderung, darf nicht 0 sein
     * @param reason     Pflichtfeld: Grund der Korrektur
     * @param order      optionale Order-Referenz (meist null bei manueller Korrektur)
     * @throws IllegalArgumentException wenn reason leer oder points 0 ist
     * @throws RuntimeException         wenn die Korrektur zu einem negativen Punktestand führen würde
     */
    @Transactional
    public LoyaltyAdjustmentResponse adjustPoints(Long storeId, String identifier, Integer points, String reason, Order order) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason must not be empty");
        }
        if (points == null || points == 0) {
            throw new IllegalArgumentException("points must not be zero");
        }

        Store store = loadStore(storeId);
        assertLoyaltyEnabled(store);

        LoyaltyIdentifier code = findActiveIdentifier(storeId, identifier);
        LoyaltyAccount account = code.getLoyaltyAccount();
        String normalizedReason = reason.trim();

        int previousBalance = account.getPointsBalance() != null ? account.getPointsBalance() : 0;
        int newBalance = previousBalance + points;
        if (newBalance < 0) {
            throw new RuntimeException("Korrektur würde zu einem negativen Punktestand führen (aktuell: " + previousBalance + ")");
        }

        account.setPointsBalance(newBalance);
        if (points > 0) {
            int previousLifetime = account.getLifetimePoints() != null ? account.getLifetimePoints() : 0;
            account.setLifetimePoints(previousLifetime + points);
        }
        loyaltyAccountRepository.save(account);

        LoyaltyTransaction transaction = new LoyaltyTransaction();
        transaction.setLoyaltyAccount(account);
        transaction.setStore(store);
        transaction.setOrder(order);
        transaction.setType(LoyaltyTransactionType.ADJUST);
        transaction.setPoints(points);
        transaction.setResultingBalance(newBalance);
        transaction.setNote(normalizedReason);
        loyaltyTransactionRepository.save(transaction);

        log.info("Loyalty points adjusted: store={}, identifier={}, points={}, reason={}, newBalance={}",
            storeId, identifier, points, normalizedReason, newBalance);

        return new LoyaltyAdjustmentResponse(
            account.getId(),
            resolveCustomerName(account.getCustomerProfile()),
            LoyaltyTransactionType.ADJUST.name(),
            points,
            previousBalance,
            newBalance,
            normalizedReason
        );
    }

    /**
     * Löst Punkte ein ("Punkte einlösen").
     *
     * Nur möglich, wenn genügend Punkte vorhanden sind (keine negative Balance).
     * Bucht intern eine negative LoyaltyTransaction (REDEEM), analog zu EARN/ADJUST.
     *
     * @param storeId    Store ID
     * @param identifier Karten-/Kundencode (muss ein aktiver Identifier sein)
     * @param points     einzulösende Punkte, MUSS positiv sein
     * @param order      optionale Order-Referenz (z.B. POS-Checkout mit Punkte-Rabatt)
     * @throws IllegalArgumentException wenn points nicht positiv ist
     * @throws RuntimeException         wenn nicht genügend Punkte vorhanden sind
     */
    @Transactional
    public LoyaltyAdjustmentResponse redeemPoints(Long storeId, String identifier, Integer points, Order order) {
        if (points == null || points <= 0) {
            throw new IllegalArgumentException("points must be positive");
        }

        Store store = loadStore(storeId);
        assertLoyaltyEnabled(store);

        LoyaltyIdentifier code = findActiveIdentifier(storeId, identifier);
        LoyaltyAccount account = code.getLoyaltyAccount();

        int previousBalance = account.getPointsBalance() != null ? account.getPointsBalance() : 0;
        if (points > previousBalance) {
            throw new RuntimeException("Nicht genügend Punkte vorhanden (verfügbar: " + previousBalance + ", angefragt: " + points + ")");
        }
        int newBalance = previousBalance - points;

        account.setPointsBalance(newBalance);
        loyaltyAccountRepository.save(account);

        LoyaltyTransaction transaction = new LoyaltyTransaction();
        transaction.setLoyaltyAccount(account);
        transaction.setStore(store);
        transaction.setOrder(order);
        transaction.setType(LoyaltyTransactionType.REDEEM);
        transaction.setPoints(-points);
        transaction.setResultingBalance(newBalance);
        loyaltyTransactionRepository.save(transaction);

        log.info("Loyalty points redeemed: store={}, identifier={}, points={}, newBalance={}",
            storeId, identifier, points, newBalance);

        return new LoyaltyAdjustmentResponse(
            account.getId(),
            resolveCustomerName(account.getCustomerProfile()),
            LoyaltyTransactionType.REDEEM.name(),
            -points,
            previousBalance,
            newBalance,
            null
        );
    }

    /**
     * Punkteberechnung – bewusst währungsunabhängig.
     * points = floor(amount / amountStep) * pointsPerStep
     * Beispiel: amountStep=10, pointsPerStep=1, amount=220 → 22 Punkte.
     */
    public int calculatePoints(BigDecimal amount, Store store) {
        BigDecimal amountStep = store.getLoyaltyAmountStep();
        Integer pointsPerStep = store.getLoyaltyPointsPerStep();

        if (amountStep == null || amountStep.compareTo(BigDecimal.ZERO) <= 0
            || pointsPerStep == null || pointsPerStep <= 0
            || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        BigDecimal steps = amount.divide(amountStep, 0, RoundingMode.DOWN);
        return steps.multiply(BigDecimal.valueOf(pointsPerStep)).intValue();
    }

    /**
     * Lädt bestehende Store-Kunden für die Loyalty-Code-Registrierung
     * (Dropdown/Suche in der UI, wenn ein Code noch keinem Kunden zugeordnet ist).
     *
     * Nutzt ausschließlich das bestehende CustomerProfile – keine neue Customer-Struktur.
     *
     * @param storeId Store ID
     * @param query   optionaler Suchbegriff (Name, E-Mail, Telefon); leer = zuletzt angelegte Kunden
     * @return bis zu 20 passende Kunden
     */
    @Transactional(readOnly = true)
    public List<LoyaltyCustomerOptionDTO> searchStoreCustomers(Long storeId, String query) {
        List<CustomerProfile> profiles = (query == null || query.isBlank())
            ? customerProfileRepository.findRecentByStoreId(storeId)
            : customerProfileRepository.searchByStoreId(storeId, query.trim());

        return profiles.stream()
            .limit(20)
            .map(profile -> new LoyaltyCustomerOptionDTO(
                profile.getId(),
                resolveCustomerName(profile),
                profile.getUser() != null ? profile.getUser().getEmail() : null,
                profile.getPhone(),
                loyaltyAccountRepository.findByStoreIdAndCustomerProfileId(storeId, profile.getId()).isPresent()
            ))
            .toList();
    }

    /**
     * Lädt alle Loyalty-Accounts eines Stores für die "Bonuskarten"-Übersicht
     * (ResponsiveDataList auf der Loyalty-Seite).
     *
     * Pro Account wird der primäre/erste (bevorzugt aktive) Identifier sowie
     * der Zeitpunkt der letzten EARN-Transaction ermittelt - beides über
     * genau je eine zusätzliche Query (kein N+1: 3 Queries insgesamt,
     * unabhängig von der Anzahl der Accounts).
     *
     * @param storeId Store ID
     * @return Listen-Einträge, neueste Accounts zuerst
     */
    @Transactional(readOnly = true)
    public List<LoyaltyAccountListItemDTO> listAccounts(Long storeId) {
        List<LoyaltyAccount> accounts = loyaltyAccountRepository.findAllByStoreIdWithCustomer(storeId);

        Map<Long, LoyaltyIdentifier> primaryIdentifierByAccountId = new HashMap<>();
        for (LoyaltyIdentifier identifier : loyaltyIdentifierRepository.findByStoreIdOrderByCreatedAtAsc(storeId)) {
            Long accountId = identifier.getLoyaltyAccount().getId();
            LoyaltyIdentifier current = primaryIdentifierByAccountId.get(accountId);
            if (current == null
                || (current.getStatus() != LoyaltyIdentifierStatus.ACTIVE
                    && identifier.getStatus() == LoyaltyIdentifierStatus.ACTIVE)) {
                // Erster gefundener Identifier je Account (älteste zuerst), aber ein
                // AKTIVER Identifier verdrängt einen bereits gemerkten inaktiven.
                primaryIdentifierByAccountId.put(accountId, identifier);
            }
        }

        Map<Long, LocalDateTime> lastEarnByAccountId = loyaltyTransactionRepository
            .findLastEarnByStoreId(storeId).stream()
            .collect(Collectors.toMap(
                LoyaltyTransactionRepository.LastEarnProjection::getLoyaltyAccountId,
                LoyaltyTransactionRepository.LastEarnProjection::getLastEarnAt
            ));

        Map<Long, BigDecimal> openAmountByAccountId = customerCreditAccountRepository.findByStoreId(storeId).stream()
            .collect(Collectors.toMap(
                creditAccount -> creditAccount.getLoyaltyAccount().getId(),
                CustomerCreditAccount::getBalanceOwed
            ));

        return accounts.stream()
            .map(account -> toListItemDTO(
                account,
                primaryIdentifierByAccountId.get(account.getId()),
                lastEarnByAccountId.get(account.getId()),
                openAmountByAccountId.get(account.getId())
            ))
            .toList();
    }

    /**
     * Transaktionshistorie (Punkte-Buchungen) eines LoyaltyAccount, neueste zuerst.
     *
     * Nutzt {@link LoyaltyTransaction#getResultingBalance()} (bereits bei jeder
     * Buchung als Snapshot gespeichert) - keine Neuberechnung nötig.
     *
     * @param storeId          Store ID (Multi-Tenant)
     * @param loyaltyAccountId zu prüfender Account
     * @throws RuntimeException  wenn der Account nicht existiert
     * @throws SecurityException wenn der Account einem anderen Store gehört
     */
    @Transactional(readOnly = true)
    public List<LoyaltyTransactionDTO> getTransactionHistory(Long storeId, Long loyaltyAccountId) {
        LoyaltyAccount account = loyaltyAccountRepository.findById(loyaltyAccountId)
            .orElseThrow(() -> new RuntimeException("Loyalty account not found: " + loyaltyAccountId));

        if (account.getStore() == null || !account.getStore().getId().equals(storeId)) {
            throw new SecurityException("Loyalty account " + loyaltyAccountId + " does not belong to store " + storeId);
        }

        return loyaltyTransactionRepository
            .findByLoyaltyAccountIdAndStoreIdOrderByCreatedAtDesc(loyaltyAccountId, storeId)
            .stream()
            .map(this::toTransactionDTO)
            .toList();
    }

    private LoyaltyTransactionDTO toTransactionDTO(LoyaltyTransaction transaction) {
        return new LoyaltyTransactionDTO(
            transaction.getId(),
            transaction.getType().name(),
            transaction.getPoints(),
            transaction.getAmount(),
            transaction.getResultingBalance(),
            transaction.getNote(),
            transaction.getOrder() != null ? transaction.getOrder().getId() : null,
            transaction.getCreatedAt()
        );
    }

    /**
     * Öffentlicher Zugriff auf den bestehenden Identifier-Gatekeeper
     * ({@link #findActiveIdentifier}) für andere fachlich getrennte Services
     * (z.B. CreditService), die denselben Karten-/Kundencode verwenden, aber
     * KEINE eigene BLOCKED/REPLACED-Prüflogik duplizieren sollen.
     *
     * @throws IllegalArgumentException wenn identifier leer ist
     * @throws IllegalStateException    wenn der Identifier BLOCKED/REPLACED ist
     * @throws RuntimeException         wenn der Identifier nicht existiert
     */
    @Transactional(readOnly = true)
    public LoyaltyAccount findAccountByActiveIdentifier(Long storeId, String identifier) {
        return findActiveIdentifier(storeId, identifier).getLoyaltyAccount();
    }

    private LoyaltyIdentifier findActiveIdentifier(Long storeId, String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("identifier must not be empty");
        }
        LoyaltyIdentifier code = loyaltyIdentifierRepository
            .findByStoreIdAndIdentifier(storeId, identifier.trim())
            .orElseThrow(() -> new RuntimeException("Loyalty code not found: " + identifier));

        if (code.getStatus() == LoyaltyIdentifierStatus.BLOCKED) {
            // Bewusst KEIN generisches 404: Identifier existiert, ist aber gesperrt.
            throw new IllegalStateException("Diese Bonuskarte ist gesperrt.");
        }
        if (code.getStatus() == LoyaltyIdentifierStatus.REPLACED) {
            // Bewusst KEIN generisches 404: Identifier existiert, wurde aber ersetzt.
            throw new IllegalStateException("Diese Bonuskarte wurde ersetzt.");
        }
        return code;
    }

    /**
     * Sperrt einen bestehenden LoyaltyIdentifier ("Karte sperren").
     *
     * LoyaltyAccount und Punktestand bleiben UNVERÄNDERT - nur der Identifier
     * wird auf BLOCKED gesetzt. Danach kann der Code nicht mehr für Lookup,
     * Punktesammeln oder -einlösen verwendet werden (siehe findActiveIdentifier()).
     *
     * @param storeId     Store ID (Multi-Tenant)
     * @param identifierId zu sperrender LoyaltyIdentifier
     * @throws RuntimeException  wenn der Identifier nicht existiert
     * @throws SecurityException wenn der Identifier einem anderen Store gehört
     */
    @Transactional
    public void blockIdentifier(Long storeId, Long identifierId) {
        LoyaltyIdentifier identifier = loyaltyIdentifierRepository.findById(identifierId)
            .orElseThrow(() -> new RuntimeException("Loyalty identifier not found: " + identifierId));

        if (identifier.getStore() == null || !identifier.getStore().getId().equals(storeId)) {
            throw new SecurityException("Loyalty identifier " + identifierId + " does not belong to store " + storeId);
        }

        if (identifier.getStatus() == LoyaltyIdentifierStatus.REPLACED) {
            throw new RuntimeException("Loyalty identifier is already replaced and cannot be blocked: " + identifierId);
        }

        identifier.setStatus(LoyaltyIdentifierStatus.BLOCKED);
        loyaltyIdentifierRepository.save(identifier);

        log.info("Loyalty identifier blocked: store={}, identifierId={}, loyaltyAccount={}",
            storeId, identifierId, identifier.getLoyaltyAccount().getId());
    }

    /**
     * Ersetzt einen bestehenden LoyaltyIdentifier durch einen neuen ("Karte ersetzen").
     *
     * Der ALTE Identifier wird auf REPLACED gesetzt (nicht gelöscht - Audit-Trail
     * bleibt erhalten), ein NEUER Identifier wird als ACTIVE angelegt und an
     * DENSELBEN LoyaltyAccount gehängt. pointsBalance/lifetimePoints werden
     * NICHT angefasst - der Punktestand bleibt exakt erhalten.
     *
     * @param storeId       Store ID (Multi-Tenant)
     * @param identifierId  zu ersetzender (alter) LoyaltyIdentifier
     * @param newIdentifier neuer, im Store noch nicht existierender Code
     * @return LoyaltyAccountDTO des unveränderten Accounts (zur Bestätigung in der UI)
     * @throws IllegalArgumentException wenn newIdentifier leer ist
     * @throws RuntimeException  wenn der alte Identifier nicht existiert, bereits ersetzt
     *                           wurde oder newIdentifier im Store bereits vergeben ist
     * @throws SecurityException wenn der alte Identifier einem anderen Store gehört
     *
     * WICHTIG: @Transactional - falls das Anlegen des neuen Identifiers
     * fehlschlägt, wird das REPLACED-Setzen des alten Identifiers automatisch
     * zurückgerollt (kein "verwaister" alter Zustand ohne nutzbare Karte).
     */
    @Transactional
    public LoyaltyAccountDTO replaceIdentifier(Long storeId, Long identifierId, String newIdentifier) {
        if (newIdentifier == null || newIdentifier.isBlank()) {
            throw new IllegalArgumentException("newIdentifier must not be empty");
        }
        String normalizedNewIdentifier = newIdentifier.trim();

        Store store = loadStore(storeId);

        LoyaltyIdentifier oldIdentifier = loyaltyIdentifierRepository.findById(identifierId)
            .orElseThrow(() -> new RuntimeException("Loyalty identifier not found: " + identifierId));

        if (oldIdentifier.getStore() == null || !oldIdentifier.getStore().getId().equals(storeId)) {
            throw new SecurityException("Loyalty identifier " + identifierId + " does not belong to store " + storeId);
        }

        if (oldIdentifier.getStatus() == LoyaltyIdentifierStatus.REPLACED) {
            throw new RuntimeException("Loyalty identifier is already replaced: " + identifierId);
        }

        if (loyaltyIdentifierRepository.existsByStoreIdAndIdentifier(storeId, normalizedNewIdentifier)) {
            throw new RuntimeException("Identifier already registered: " + normalizedNewIdentifier);
        }

        LoyaltyAccount account = oldIdentifier.getLoyaltyAccount();

        oldIdentifier.setStatus(LoyaltyIdentifierStatus.REPLACED);
        loyaltyIdentifierRepository.save(oldIdentifier);

        LoyaltyIdentifier newCard = new LoyaltyIdentifier();
        newCard.setStore(store);
        newCard.setLoyaltyAccount(account);
        newCard.setIdentifier(normalizedNewIdentifier);
        newCard.setStatus(LoyaltyIdentifierStatus.ACTIVE);
        loyaltyIdentifierRepository.save(newCard);

        log.info("Loyalty identifier replaced: store={}, loyaltyAccount={}, oldIdentifierId={}, newIdentifier={}",
            storeId, account.getId(), identifierId, normalizedNewIdentifier);

        // pointsBalance/lifetimePoints bewusst NICHT verändert - account wird 1:1 aus DB zurückgegeben.
        return toAccountDTO(account, store);
    }

    private Store loadStore(Long storeId) {
        return storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));
    }

    private void assertLoyaltyEnabled(Store store) {
        if (store.getLoyaltyEnabled() == null || !store.getLoyaltyEnabled()) {
            throw new RuntimeException("Loyalty program is not enabled for this store");
        }
    }

    private LoyaltyAccountDTO toAccountDTO(LoyaltyAccount account, Store store) {
        CustomerProfile profile = account.getCustomerProfile();
        LoyaltyAccountDTO dto = new LoyaltyAccountDTO();
        dto.setLoyaltyAccountId(account.getId());
        dto.setCustomerProfileId(profile != null ? profile.getId() : null);
        dto.setCustomerName(resolveCustomerName(profile));
        dto.setPointsBalance(account.getPointsBalance());
        dto.setLifetimePoints(account.getLifetimePoints());
        dto.setCurrencyCode(store.getCurrencyCode() != null ? store.getCurrencyCode().name() : null);
        dto.setAnonymous(profile == null);
        dto.setOpenAmount(customerCreditAccountRepository.findByLoyaltyAccountId(account.getId())
            .map(CustomerCreditAccount::getBalanceOwed)
            .orElse(BigDecimal.ZERO));
        return dto;
    }

    private LoyaltyAccountListItemDTO toListItemDTO(
        LoyaltyAccount account, LoyaltyIdentifier primaryIdentifier, LocalDateTime lastPurchaseAt, BigDecimal openAmount
    ) {
        CustomerProfile profile = account.getCustomerProfile();
        LoyaltyAccountListItemDTO dto = new LoyaltyAccountListItemDTO();
        dto.setLoyaltyAccountId(account.getId());
        dto.setCustomerProfileId(profile != null ? profile.getId() : null);
        dto.setCustomerName(resolveCustomerName(profile));
        dto.setAnonymous(profile == null);
        dto.setIdentifier(primaryIdentifier != null ? primaryIdentifier.getIdentifier() : null);
        dto.setStatus(primaryIdentifier != null ? primaryIdentifier.getStatus().name() : null);
        dto.setPointsBalance(account.getPointsBalance());
        dto.setCreatedAt(account.getCreatedAt());
        dto.setLastPurchaseAt(lastPurchaseAt);
        dto.setLoyaltyIdentifierId(primaryIdentifier != null ? primaryIdentifier.getId() : null);
        dto.setOpenAmount(openAmount != null ? openAmount : BigDecimal.ZERO);
        return dto;
    }

    private String resolveCustomerName(CustomerProfile profile) {
        if (profile == null) {
            return null;
        }
        String first = profile.getFirstName();
        String last = profile.getLastName();
        if (first != null && !first.isBlank()) {
            return last != null && !last.isBlank() ? first.trim() + " " + last.trim() : first.trim();
        }
        if (profile.getUser() != null && profile.getUser().getName() != null) {
            return profile.getUser().getName();
        }
        return "Kunde #" + profile.getId();
    }
}
