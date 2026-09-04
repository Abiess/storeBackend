package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import storebackend.dto.LoyaltyAccountDTO;
import storebackend.entity.LoyaltyAccount;
import storebackend.entity.LoyaltyIdentifier;
import storebackend.entity.Store;
import storebackend.enums.LoyaltyIdentifierStatus;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.CustomerCreditAccountRepository;
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
 * Test für "Karte sperren" / "Karte ersetzen" (LoyaltyService).
 *
 * Deckt die in der Aufgabenstellung geforderten Verifikationsszenarien ab:
 * 1. ACTIVE Karte wird gefunden (lookup)
 * 2. ACTIVE Karte sperren
 * 3. Danach Lookup -> gesperrt (IllegalStateException, kein generisches 404)
 * 4. Punkte unverändert
 * 5. BLOCKED Karte ersetzen
 * 6. Neue Karte ACTIVE
 * 7. Alte Karte REPLACED
 * 8. Neue Karte zeigt denselben Punktestand
 * 9. Alte Karte kann nicht mehr verwendet werden (REPLACED -> IllegalStateException)
 * 10. Store-Trennung (SecurityException bei fremdem Store)
 */
class LoyaltyServiceTest {

    @Mock
    private LoyaltyAccountRepository loyaltyAccountRepository;
    @Mock
    private LoyaltyIdentifierRepository loyaltyIdentifierRepository;
    @Mock
    private LoyaltyTransactionRepository loyaltyTransactionRepository;
    @Mock
    private CustomerProfileRepository customerProfileRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private CustomerCreditAccountRepository customerCreditAccountRepository;

    @InjectMocks
    private LoyaltyService loyaltyService;

    private Store store;
    private LoyaltyAccount account;
    private LoyaltyIdentifier activeIdentifier;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        store = new Store();
        store.setId(100L);
        store.setLoyaltyEnabled(true);
        store.setLoyaltyAmountStep(new BigDecimal("10.00"));
        store.setLoyaltyPointsPerStep(1);

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

        // toAccountDTO() prüft immer den offenen Credit-Betrag (fachlich getrennt,
        // aber UX-seitig mit angezeigt) - Default: kein CreditAccount vorhanden.
        when(customerCreditAccountRepository.findByLoyaltyAccountId(anyLong())).thenReturn(Optional.empty());
    }

    @Test
    void lookupByIdentifier_findsActiveCard() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        LoyaltyAccountDTO dto = loyaltyService.lookupByIdentifier(100L, "1411");

        assertEquals(1L, dto.getLoyaltyAccountId());
        assertEquals(73, dto.getPointsBalance());
    }

    @Test
    void blockIdentifier_setsStatusBlocked_accountAndPointsUnchanged() {
        when(loyaltyIdentifierRepository.findById(10L)).thenReturn(Optional.of(activeIdentifier));

        loyaltyService.blockIdentifier(100L, 10L);

        assertEquals(LoyaltyIdentifierStatus.BLOCKED, activeIdentifier.getStatus());
        assertEquals(73, account.getPointsBalance()); // Punkte unverändert
        verify(loyaltyIdentifierRepository).save(activeIdentifier);
        verify(loyaltyAccountRepository, never()).save(any()); // Account wird NICHT angefasst
    }

    @Test
    void lookupByIdentifier_afterBlock_throwsIllegalStateException_notGeneric404() {
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.BLOCKED);
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> loyaltyService.lookupByIdentifier(100L, "1411"));
        assertTrue(ex.getMessage().contains("gesperrt"));
    }

    @Test
    void replaceIdentifier_blockedCard_createsNewActiveCard_sameAccount_samePoints() {
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.BLOCKED);
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findById(10L)).thenReturn(Optional.of(activeIdentifier));
        when(loyaltyIdentifierRepository.existsByStoreIdAndIdentifier(100L, "889900")).thenReturn(false);

        LoyaltyAccountDTO dto = loyaltyService.replaceIdentifier(100L, 10L, "889900");

        // Alte Karte REPLACED
        assertEquals(LoyaltyIdentifierStatus.REPLACED, activeIdentifier.getStatus());

        // Neue Karte ACTIVE, gleicher Account, gleiche Punkte
        assertEquals(1L, dto.getLoyaltyAccountId());
        assertEquals(73, dto.getPointsBalance());

        verify(loyaltyIdentifierRepository, times(2)).save(any(LoyaltyIdentifier.class));
        verify(loyaltyAccountRepository, never()).save(any()); // pointsBalance/lifetimePoints unangetastet
    }

    @Test
    void replaceIdentifier_rejectsAlreadyExistingNewIdentifier() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findById(10L)).thenReturn(Optional.of(activeIdentifier));
        when(loyaltyIdentifierRepository.existsByStoreIdAndIdentifier(100L, "889900")).thenReturn(true);

        assertThrows(RuntimeException.class,
            () -> loyaltyService.replaceIdentifier(100L, 10L, "889900"));
    }

    @Test
    void lookupByIdentifier_afterReplace_throwsIllegalStateException_oldCardNotUsable() {
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.REPLACED);
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> loyaltyService.lookupByIdentifier(100L, "1411"));
        assertTrue(ex.getMessage().contains("ersetzt"));
    }

    @Test
    void blockIdentifier_wrongStore_throwsSecurityException() {
        Store otherStore = new Store();
        otherStore.setId(999L);
        activeIdentifier.setStore(otherStore);
        when(loyaltyIdentifierRepository.findById(10L)).thenReturn(Optional.of(activeIdentifier));

        assertThrows(SecurityException.class, () -> loyaltyService.blockIdentifier(100L, 10L));
    }

    @Test
    void replaceIdentifier_wrongStore_throwsSecurityException() {
        Store otherStore = new Store();
        otherStore.setId(999L);
        activeIdentifier.setStore(otherStore);
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findById(10L)).thenReturn(Optional.of(activeIdentifier));

        assertThrows(SecurityException.class, () -> loyaltyService.replaceIdentifier(100L, 10L, "889900"));
    }

    // ─── ADJUST ───

    @Test
    void adjustPoints_positive_increasesBalance_requiresReason() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        var response = loyaltyService.adjustPoints(100L, "1411", 10, "Kulanz", null);

        assertEquals(83, response.getNewBalance());
        assertEquals(83, account.getPointsBalance());
        assertEquals("ADJUST", response.getType());
        verify(loyaltyTransactionRepository).save(any());
    }

    @Test
    void adjustPoints_negative_decreasesBalance() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        var response = loyaltyService.adjustPoints(100L, "1411", -20, "Korrektur", null);

        assertEquals(53, response.getNewBalance());
        assertEquals(53, account.getPointsBalance());
    }

    @Test
    void adjustPoints_withoutReason_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
            () -> loyaltyService.adjustPoints(100L, "1411", 10, "  ", null));
    }

    @Test
    void adjustPoints_wouldGoNegative_throwsRuntimeException() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        assertThrows(RuntimeException.class,
            () -> loyaltyService.adjustPoints(100L, "1411", -100, "Zu viel", null));
        assertEquals(73, account.getPointsBalance()); // unverändert bei Fehler
    }

    @Test
    void adjustPoints_onBlockedCard_throwsIllegalStateException() {
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.BLOCKED);
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        assertThrows(IllegalStateException.class,
            () -> loyaltyService.adjustPoints(100L, "1411", 10, "Kulanz", null));
    }

    // ─── REDEEM ───

    @Test
    void redeemPoints_sufficientBalance_decreasesBalance() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        var response = loyaltyService.redeemPoints(100L, "1411", 50, null);

        assertEquals(23, response.getNewBalance());
        assertEquals(23, account.getPointsBalance());
        assertEquals(-50, response.getPoints());
        assertEquals("REDEEM", response.getType());
    }

    @Test
    void redeemPoints_insufficientBalance_throwsRuntimeException_noNegativeBalance() {
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        assertThrows(RuntimeException.class,
            () -> loyaltyService.redeemPoints(100L, "1411", 100, null));
        assertEquals(73, account.getPointsBalance()); // unverändert bei Fehler
    }

    @Test
    void redeemPoints_negativeOrZero_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> loyaltyService.redeemPoints(100L, "1411", 0, null));
        assertThrows(IllegalArgumentException.class, () -> loyaltyService.redeemPoints(100L, "1411", -5, null));
    }

    @Test
    void redeemPoints_onReplacedCard_throwsIllegalStateException() {
        activeIdentifier.setStatus(LoyaltyIdentifierStatus.REPLACED);
        when(storeRepository.findById(100L)).thenReturn(Optional.of(store));
        when(loyaltyIdentifierRepository.findByStoreIdAndIdentifier(100L, "1411"))
            .thenReturn(Optional.of(activeIdentifier));

        assertThrows(IllegalStateException.class, () -> loyaltyService.redeemPoints(100L, "1411", 10, null));
    }
}
