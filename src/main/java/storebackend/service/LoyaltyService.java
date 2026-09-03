package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.LoyaltyAccountDTO;
import storebackend.dto.LoyaltyCustomerOptionDTO;
import storebackend.dto.LoyaltyPurchaseResponse;
import storebackend.entity.*;
import storebackend.enums.LoyaltyIdentifierStatus;
import storebackend.enums.LoyaltyTransactionType;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.LoyaltyAccountRepository;
import storebackend.repository.LoyaltyIdentifierRepository;
import storebackend.repository.LoyaltyTransactionRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

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

    private LoyaltyIdentifier findActiveIdentifier(Long storeId, String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("identifier must not be empty");
        }
        LoyaltyIdentifier code = loyaltyIdentifierRepository
            .findByStoreIdAndIdentifier(storeId, identifier.trim())
            .orElseThrow(() -> new RuntimeException("Loyalty code not found: " + identifier));

        if (code.getStatus() != LoyaltyIdentifierStatus.ACTIVE) {
            throw new RuntimeException("Loyalty code is not active: " + identifier);
        }
        return code;
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
