package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import storebackend.config.SaasProperties;
import storebackend.entity.Domain;
import storebackend.entity.Plan;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DomainType;
import storebackend.enums.Role;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;
import storebackend.repository.StoreRepository;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DomainServiceTest {

    @Mock
    private DomainRepository domainRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private SaasProperties saasProperties;

    @InjectMocks
    private DomainService domainService;

    private User testUser;
    private Store testStore;
    private Plan freePlan;

    @BeforeEach
    void setUp() {
        // Setup FREE Plan
        freePlan = new Plan();
        freePlan.setId(1L);
        freePlan.setName("FREE");
        freePlan.setMaxStores(1);
        freePlan.setMaxCustomDomains(0);
        freePlan.setMaxSubdomains(1);

        // Setup Test User
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setPlan(freePlan);
        Set<Role> roles = new HashSet<>();
        roles.add(Role.ROLE_STORE_OWNER);
        testUser.setRoles(roles);

        // Setup Test Store
        testStore = new Store();
        testStore.setId(1L);
        testStore.setOwner(testUser);
        testStore.setName("Test Shop");
        testStore.setSlug("testshop");
        testStore.setStatus(StoreStatus.ACTIVE);

        // Setup SaaS Properties Mock - Lenient für alle Tests
        lenient().when(saasProperties.getBaseDomain()).thenReturn("markt.ma");
        lenient().when(saasProperties.generateSubdomain(anyString())).thenReturn("testshop.markt.ma");
        lenient().when(saasProperties.isSubdomainOfBaseDomain(anyString())).thenReturn(false);
        lenient().when(saasProperties.isSubdomainOfBaseDomain("testshop.markt.ma")).thenReturn(true);
        lenient().when(saasProperties.extractSlugFromSubdomain("testshop.markt.ma")).thenReturn("testshop");

        SaasProperties.DomainVerification domainVerification = new SaasProperties.DomainVerification();
        domainVerification.setTxtRecordPrefix("_marktma-verification");
        domainVerification.setTokenLength(32);
        lenient().when(saasProperties.getDomainVerification()).thenReturn(domainVerification);
    }

    @Test
    void createSubdomain_Success() {
        // Given
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(domainRepository.countByStoreAndType(testStore, DomainType.SUBDOMAIN)).thenReturn(0L);
        when(domainRepository.existsByHost("testshop.markt.ma")).thenReturn(false);
        when(domainRepository.save(any(Domain.class))).thenAnswer(invocation -> {
            Domain domain = invocation.getArgument(0);
            domain.setId(1L);
            return domain;
        });

        // When
        Domain result = domainService.createSubdomain(1L, testUser);

        // Then
        assertNotNull(result);
        assertEquals("testshop.markt.ma", result.getHost());
        assertEquals(DomainType.SUBDOMAIN, result.getType());
        assertTrue(result.getIsVerified());
        assertTrue(result.getIsPrimary());
        verify(domainRepository).save(any(Domain.class));
    }

    @Test
    void createSubdomain_ExceedsLimit() {
        // Given
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(domainRepository.countByStoreAndType(testStore, DomainType.SUBDOMAIN)).thenReturn(1L);

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> domainService.createSubdomain(1L, testUser));
        assertEquals("Maximum number of subdomains reached for your plan", exception.getMessage());
    }

    @Test
    void createCustomDomain_Success() {
        // Given
        Plan proPlan = new Plan();
        proPlan.setMaxCustomDomains(5);
        testUser.setPlan(proPlan);

        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(domainRepository.countByStoreAndType(testStore, DomainType.CUSTOM)).thenReturn(0L);
        when(domainRepository.existsByHost("shop.customer.com")).thenReturn(false);
        when(domainRepository.save(any(Domain.class))).thenAnswer(invocation -> {
            Domain domain = invocation.getArgument(0);
            domain.setId(2L);
            return domain;
        });

        // When
        Domain result = domainService.createCustomDomain(1L, "shop.customer.com", testUser);

        // Then
        assertNotNull(result);
        assertEquals("shop.customer.com", result.getHost());
        assertEquals(DomainType.CUSTOM, result.getType());
        assertFalse(result.getIsVerified());
        assertFalse(result.getIsPrimary());
        assertNotNull(result.getVerificationToken());
        verify(domainRepository).save(any(Domain.class));
    }

    @Test
    void createCustomDomain_ExceedsLimit() {
        // Given
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(domainRepository.countByStoreAndType(testStore, DomainType.CUSTOM)).thenReturn(0L);

        // When & Then (FREE plan has 0 custom domains limit)
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> domainService.createCustomDomain(1L, "shop.customer.com", testUser));
        assertEquals("Maximum number of custom domains reached for your plan", exception.getMessage());
    }

    @Test
    void accessControl_UnauthorizedUser() {
        // Given
        User otherUser = new User();
        otherUser.setId(2L);

        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));

        // When & Then
        SecurityException exception = assertThrows(SecurityException.class,
                () -> domainService.getDomainsForStore(1L, otherUser));
        assertEquals("Access denied", exception.getMessage());
    }
}
