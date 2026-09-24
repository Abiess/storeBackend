package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreditAccountDTO;
import storebackend.dto.CreditTransactionDTO;
import storebackend.entity.CreditTransaction;
import storebackend.entity.CustomerCreditAccount;
import storebackend.entity.LoyaltyAccount;
import storebackend.entity.Order;
import storebackend.entity.Store;
import storebackend.enums.CreditTransactionType;
import storebackend.repository.CreditTransactionRepository;
import storebackend.repository.CustomerCreditAccountRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Customer Credit Service ("Anschreiben" / "Später bezahlen")
 *
 * Fachlich vollständig getrennt von {@link LoyaltyService} (eigene Tabellen,
 * eigener Audit-Trail: {@link CustomerCreditAccount}/{@link CreditTransaction}),
 * aber 1:1 an einen bestehenden {@link LoyaltyAccount} gebunden - KEIN neues
 * Karten-/Identifier-Konzept. Der Karten-/Kundencode-Lookup (inkl. BLOCKED/
 * REPLACED-Prüfung) wird über {@link LoyaltyService#findAccountByActiveIdentifier}
 * wiederverwendet (single choke-point, keine doppelte Status-Logik).
 *
 * balanceOwed wird AUSSCHLIESSLICH über {@link #charge} / {@link #pay}
 * verändert, nie direkt (Audit-Trail, analog zu LoyaltyAccount.pointsBalance).
 * Ein CustomerCreditAccount wird LAZY angelegt (erst bei erster Credit-Nutzung).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CreditService {

    private final CustomerCreditAccountRepository customerCreditAccountRepository;
    private final CreditTransactionRepository creditTransactionRepository;
    private final StoreRepository storeRepository;
    private final LoyaltyService loyaltyService;

    /**
     * Liefert den offenen Betrag zu einem Karten-/Kundencode. Existiert noch
     * kein CustomerCreditAccount, gilt der offene Betrag als 0 (siehe UX-Vorgabe:
     * "Offener Betrag: 0" bei erstem Scan ohne bisherige Credit-Nutzung).
     */
    @Transactional(readOnly = true)
    public CreditAccountDTO getCreditInfo(Long storeId, String identifier) {
        LoyaltyAccount account = loyaltyService.findAccountByActiveIdentifier(storeId, identifier);
        return toAccountDTO(account.getId(), findCreditAccount(account.getId()).orElse(null));
    }

    /**
     * "Später bezahlen" / CHARGE: erhöht den offenen Betrag.
     *
     * @param storeId    Store ID (Multi-Tenant)
     * @param identifier Karten-/Kundencode (muss ein aktiver LoyaltyIdentifier sein)
     * @param amount     Betrag, MUSS positiv sein
     * @param order      optionale Order-Referenz (POS-Checkout mit "Später bezahlen")
     * @param note       optionale Notiz (z.B. bei manueller Buchung ohne Order)
     * @throws IllegalArgumentException wenn amount nicht positiv ist
     * @throws IllegalStateException    wenn diese Order bereits einmal als CHARGE verbucht wurde,
     *                                  oder der Identifier BLOCKED/REPLACED ist
     * @throws RuntimeException         wenn dadurch das Kreditlimit überschritten würde
     */
    @Transactional
    public CreditTransactionDTO charge(Long storeId, String identifier, BigDecimal amount, Order order, String note) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }

        // findAccountByActiveIdentifier wirft IllegalStateException bei BLOCKED/REPLACED
        // (single choke-point, siehe Klassendoku) - kein generisches 404 für gesperrte Karten.
        LoyaltyAccount loyaltyAccount = loyaltyService.findAccountByActiveIdentifier(storeId, identifier);

        if (order != null
            && creditTransactionRepository.existsByStoreIdAndOrderIdAndType(storeId, order.getId(), CreditTransactionType.CHARGE)) {
            // Bewusst KEIN generisches 400: Order existiert, wurde aber bereits verbucht.
            throw new IllegalStateException("Diese Order wurde bereits als Anschreiben verbucht: " + order.getId());
        }

        Store store = loadStore(storeId);
        CustomerCreditAccount creditAccount = getOrCreateCreditAccount(store, loyaltyAccount);

        BigDecimal previousBalance = creditAccount.getBalanceOwed();
        BigDecimal newBalance = previousBalance.add(amount);

        if (creditAccount.getCreditLimit() != null && newBalance.compareTo(creditAccount.getCreditLimit()) > 0) {
            throw new RuntimeException(
                "Kreditlimit überschritten (Limit: " + creditAccount.getCreditLimit() + ", neuer Betrag wäre: " + newBalance + ")");
        }

        creditAccount.setBalanceOwed(newBalance);
        customerCreditAccountRepository.save(creditAccount);

        CreditTransaction transaction = buildTransaction(creditAccount, store, order, CreditTransactionType.CHARGE, amount, newBalance, note);
        creditTransactionRepository.save(transaction);

        log.info("Credit charged: store={}, identifier={}, amount={}, newBalance={}, orderId={}",
            storeId, identifier, amount, newBalance, order != null ? order.getId() : null);

        return toTransactionDTO(transaction);
    }

    /**
     * "Zahlung erfassen" / PAYMENT: reduziert den offenen Betrag.
     * Keine negative Balance zulässig (analog zu LoyaltyService.redeemPoints()).
     *
     * @throws IllegalArgumentException wenn amount nicht positiv ist
     * @throws RuntimeException         wenn amount den aktuellen offenen Betrag übersteigt
     */
    @Transactional
    public CreditTransactionDTO pay(Long storeId, String identifier, BigDecimal amount, String note) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }

        LoyaltyAccount loyaltyAccount = loyaltyService.findAccountByActiveIdentifier(storeId, identifier);
        Store store = loadStore(storeId);

        CustomerCreditAccount creditAccount = findCreditAccount(loyaltyAccount.getId())
            .orElseThrow(() -> new RuntimeException("Kein offener Betrag vorhanden (kein Credit-Konto für diese Karte)"));

        BigDecimal previousBalance = creditAccount.getBalanceOwed();
        if (amount.compareTo(previousBalance) > 0) {
            throw new RuntimeException(
                "Zahlung übersteigt den offenen Betrag (offen: " + previousBalance + ", angefragt: " + amount + ")");
        }
        BigDecimal newBalance = previousBalance.subtract(amount);

        creditAccount.setBalanceOwed(newBalance);
        customerCreditAccountRepository.save(creditAccount);

        CreditTransaction transaction = buildTransaction(creditAccount, store, null, CreditTransactionType.PAYMENT, amount.negate(), newBalance, note);
        creditTransactionRepository.save(transaction);

        log.info("Credit payment recorded: store={}, identifier={}, amount={}, newBalance={}",
            storeId, identifier, amount, newBalance);

        return toTransactionDTO(transaction);
    }

    /**
     * Credit-Historie eines LoyaltyAccount, neueste zuerst (analog zu
     * LoyaltyService.getTransactionHistory()). Leere Liste, falls noch kein
     * CustomerCreditAccount existiert.
     */
    @Transactional(readOnly = true)
    public List<CreditTransactionDTO> getCreditHistory(Long storeId, Long loyaltyAccountId) {
        CustomerCreditAccount creditAccount = findCreditAccount(loyaltyAccountId).orElse(null);
        if (creditAccount == null) {
            return List.of();
        }
        if (creditAccount.getStore() == null || !creditAccount.getStore().getId().equals(storeId)) {
            throw new SecurityException("Credit account for loyalty account " + loyaltyAccountId + " does not belong to store " + storeId);
        }
        return creditTransactionRepository
            .findByCreditAccountIdAndStoreIdOrderByCreatedAtDesc(creditAccount.getId(), storeId)
            .stream()
            .map(this::toTransactionDTO)
            .toList();
    }

    private CustomerCreditAccount getOrCreateCreditAccount(Store store, LoyaltyAccount loyaltyAccount) {
        return findCreditAccount(loyaltyAccount.getId())
            .orElseGet(() -> {
                CustomerCreditAccount created = new CustomerCreditAccount();
                created.setStore(store);
                created.setLoyaltyAccount(loyaltyAccount);
                created.setBalanceOwed(BigDecimal.ZERO);
                return customerCreditAccountRepository.save(created);
            });
    }

    private java.util.Optional<CustomerCreditAccount> findCreditAccount(Long loyaltyAccountId) {
        return customerCreditAccountRepository.findByLoyaltyAccountId(loyaltyAccountId);
    }

    private CreditTransaction buildTransaction(
        CustomerCreditAccount creditAccount, Store store, Order order,
        CreditTransactionType type, BigDecimal amount, BigDecimal resultingBalance, String note
    ) {
        CreditTransaction transaction = new CreditTransaction();
        transaction.setCreditAccount(creditAccount);
        transaction.setStore(store);
        transaction.setOrder(order);
        transaction.setType(type);
        transaction.setAmount(amount);
        transaction.setResultingBalance(resultingBalance);
        transaction.setNote(note);
        return transaction;
    }

    private CreditTransactionDTO toTransactionDTO(CreditTransaction transaction) {
        return new CreditTransactionDTO(
            transaction.getId(),
            transaction.getType().name(),
            transaction.getAmount(),
            transaction.getResultingBalance(),
            transaction.getNote(),
            transaction.getOrder() != null ? transaction.getOrder().getId() : null,
            transaction.getCreatedAt()
        );
    }

    private CreditAccountDTO toAccountDTO(Long loyaltyAccountId, CustomerCreditAccount creditAccount) {
        return new CreditAccountDTO(
            loyaltyAccountId,
            creditAccount != null ? creditAccount.getBalanceOwed() : BigDecimal.ZERO,
            creditAccount != null ? creditAccount.getCreditLimit() : null
        );
    }

    private Store loadStore(Long storeId) {
        return storeRepository.findById(storeId)
            .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));
    }
}
