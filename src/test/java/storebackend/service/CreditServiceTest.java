package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import storebackend.dto.CreditAccountDTO;
import storebackend.dto.CreditTransactionDTO;
import storebackend.entity.CustomerCreditAccount;
import storebackend.entity.LoyaltyAccount;
import storebackend.entity.LoyaltyIdentifier;
import storebackend.entity.Order;
import storebackend.entity.Store;
import storebackend.enums.CreditTransactionType;
import storebackend.enums.LoyaltyIdentifierStatus;
import storebackend.repository.CreditTransactionRepository;
import storebackend.repository.CustomerCreditAccountRepository;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.LoyaltyAccountRepository;
import storebackend.repository.LoyaltyIdentifierRepository;
import storebackend.repository.LoyaltyTransactionRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Test für Customer Credit ("Anschreiben" / "Später bezahlen").
 *
 * CreditService nutzt LoyaltyService.findAccountByActiveIdentifier() als
 * Gatekeeper (single choke-point, siehe LoyaltyService) - deshalb wird hier
 * eine ECHTE LoyaltyService-Instanz (nicht gemockt) mit gemockten Repos
 * verwendet, analog zum bereits etablierten Test-Stil in LoyaltyServiceTest.
 */
class CreditServiceTest {

    @Mock
    private CustomerCreditAccountRepository customerCreditAccountRepository;
    @Mock
    private CreditTransactionRepository creditTransactionRepository;
    @Mock
    private StoreRepository storeRepository;

    @Mock
    private LoyaltyAccountRepository loyaltyAccountRepository;
    @Mock
    private LoyaltyIdentifierRepository loyaltyIdentifierRepository;
    @Mock
    private LoyaltyTransactionRepository loyaltyTransactionRepository;
    @Mock
    private CustomerProfileRepository customerProfileRepository;

    private LoyaltyService loyaltyService;

    @InjectMocks
    private CreditService creditService;

    private Store store;
    private LoyaltyAccount account;
    private LoyaltyIdentifier activeIdentifier;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        store = new Store();
        store.setId(100L);

        account = new LoyaltyAccount();
        account.setId(1L);
        account.setStore(store);
        account.setPointsBalance(73);
        account.setLifetimePoints(73);

        activeIdentifier = new LoyaltyIdentifier();
        activeIdentifier.setId(10L);
        activeIdentifier.setStore(store);
        activeIdentifier.setLoyaltyAccount(account);
        activeIdentifier.setIdentifier("1411");
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.ACTIVE);

        loyaltyService = new LoyaltyService(
            loyaltyAccountRepository, loyaltyIdentifierRepository, loyaltyTransactionRepository,
            customerProfileRepository, storeRepository, customerCreditAccountRepository
        );
        creditService = new CreditService(
            customerCreditAccountRepository, creditTransactionRepository, storeRepository, loyaltyService
        );
    }

    private CustomerCreditAccount existingCreditAccount(BigDecimal balance) {
        CustomerCreditAccount creditAccount = new CustomerCreditAccount();
        creditAccount.setId(50L);
        creditAccount.setStore(store);
        creditAccount.setLoyaltyAccount(account);
        creditAccount.setBalanceOwed(balance);
        return creditAccount;
    }

    @Test
    void getCreditInfo_noCreditAccountYet_returnsZero() {
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.empty());

        CreditAccountDTO info = creditService.getCreditInfo(100L, "1411");

        assertEquals(BigDecimal.ZERO, info.getOpenAmount());
        assertNull(info.getCreditLimit());
    }

    @Test
    void charge_lazyCreatesCreditAccount_increasesBalance() {
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.empty());
        when(customerCreditAccountRepository.save(any())).thenAnswer(inv -> {
            CustomerCreditAccount saved = inv.getArgument(0);
            saved.setId(50L);
            return saved;
        });

        CreditTransactionDTO response = creditService.charge(100L, "1411", new BigDecimal("420.00"), null, null);

        assertEquals(new BigDecimal("420.00"), response.getResultingBalance());
        assertEquals("CHARGE", response.getType());
        verify(customerCreditAccountRepository, times(2)).save(any()); // create + balance update
        verify(creditTransactionRepository).save(any());
    }

    @Test
    void charge_existingAccount_increasesBalance() {
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L))
            .thenReturn(Optional.of(existingCreditAccount(new BigDecimal("100.00"))));

        CreditTransactionDTO response = creditService.charge(100L, "1411", new BigDecimal("50.00"), null, null);

        assertEquals(new BigDecimal("150.00"), response.getResultingBalance());
    }

    @Test
    void charge_negativeOrZeroAmount_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> creditService.charge(100L, "1411", BigDecimal.ZERO, null, null));
        assertThrows(IllegalArgumentException.class, () -> creditService.charge(100L, "1411", new BigDecimal("-5"), null, null));
    }

    @Test
    void charge_blockedCard_throwsIllegalStateException() {
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.BLOCKED);
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        assertThrows(IllegalStateException.class, () -> creditService.charge(100L, "1411", new BigDecimal("10"), null, null));
    }

    @Test
    void charge_sameOrderTwice_throwsIllegalStateException() {
        Order order = new Order();
        order.setId(999L);

        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(creditTransactionRepository.existsByStoreIdAndOrderIdAndType(100L, 999L, CreditTransactionType.CHARGE))
            .thenReturn(true);

        assertThrows(IllegalStateException.class,
            () -> creditService.charge(100L, "1411", new BigDecimal("10"), order, null));
    }

    @Test
    void charge_exceedsCreditLimit_throwsRuntimeException() {
        CustomerCreditAccount creditAccount = existingCreditAccount(new BigDecimal("90.00"));
        creditAccount.setCreditLimit(new BigDecimal("100.00"));

        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.of(creditAccount));

        assertThrows(RuntimeException.class, () -> creditService.charge(100L, "1411", new BigDecimal("20.00"), null, null));
        assertEquals(new BigDecimal("90.00"), creditAccount.getBalanceOwed()); // unverändert bei Fehler
    }

    @Test
    void pay_sufficientBalance_decreasesBalance() {
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L))
            .thenReturn(Optional.of(existingCreditAccount(new BigDecimal("420.00"))));

        CreditTransactionDTO response = creditService.pay(100L, "1411", new BigDecimal("420.00"), null);

        assertEquals(BigDecimal.ZERO.setScale(2), response.getResultingBalance().setScale(2));
        assertEquals("PAYMENT", response.getType());
        assertEquals(new BigDecimal("-420.00"), response.getAmount());
    }

    @Test
    void pay_exceedsOpenAmount_throwsRuntimeException_noNegativeBalance() {
        CustomerCreditAccount creditAccount = existingCreditAccount(new BigDecimal("50.00"));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.of(creditAccount));

        assertThrows(RuntimeException.class, () -> creditService.pay(100L, "1411", new BigDecimal("100.00"), null));
        assertEquals(new BigDecimal("50.00"), creditAccount.getBalanceOwed());
    }

    @Test
    void pay_noCreditAccountYet_throwsRuntimeException() {
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> creditService.pay(100L, "1411", new BigDecimal("10.00"), null));
    }

    @Test
    void getCreditHistory_wrongStore_throwsSecurityException() {
        Store otherStore = new Store();
        otherStore.setId(999L);
        CustomerCreditAccount creditAccount = existingCreditAccount(new BigDecimal("10.00"));
        creditAccount.setStore(otherStore);
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.of(creditAccount));

        assertThrows(SecurityException.class, () -> creditService.getCreditHistory(100L, 1L));
    }

    @Test
    void getCreditHistory_noCreditAccount_returnsEmptyList() {
        when(customerCreditAccountRepository.findByLoyaltyAccountId(1L)).thenReturn(Optional.empty());

        assertTrue(creditService.getCreditHistory(100L, 1L).isEmpty());
    }
}
