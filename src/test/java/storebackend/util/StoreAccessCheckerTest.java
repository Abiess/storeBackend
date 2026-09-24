package storebackend.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests für StoreAccessChecker
 * 
 * KRITISCH: Verifiziert Store-Ownership-Logik für @PreAuthorize Security
 */
@ExtendWith(MockitoExtension.class)
class StoreAccessCheckerTest {

    @Mock
    private StoreRepository storeRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private SecurityContext securityContext;
    
    @InjectMocks
    private StoreAccessChecker storeAccessChecker;
    
    private User testUser;
    private Store testStore;
    
    @BeforeEach
    void setUp() {
        // Test User erstellen
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("essoudati@hotmail.de");
        testUser.setName("Test User");
        testUser.setRoles(Collections.singleton(Role.USER));
        
        // Test Store erstellen (User 1 ist Owner)
        testStore = new Store();
        testStore.setId(121L);
        testStore.setName("Test Shop");
        testStore.setSlug("test-shop");
        testStore.setOwner(testUser);  // KRITISCH: User 1 ist Owner
        
        // SecurityContextHolder mocken
        SecurityContextHolder.setContext(securityContext);
    }
    
    @Test
    void testUserIsOwner_ShouldGrantAccess() {
        // Arrange
        Authentication auth = new UsernamePasswordAuthenticationToken(
            testUser.getEmail(), 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(121L)).thenReturn(Optional.of(testStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertTrue(hasAccess, "User 1 should have access to Store 121 (is owner)");
        
        // Verify
        verify(userRepository).findByEmail(testUser.getEmail());
        verify(storeRepository).findById(121L);
    }
    
    @Test
    void testUserIsNotOwner_ShouldDenyAccess() {
        // Arrange
        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setEmail("other@example.com");
        otherUser.setName("Other User");
        otherUser.setRoles(Collections.singleton(Role.USER));
        
        Authentication auth = new UsernamePasswordAuthenticationToken(
            otherUser.getEmail(), 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));
        when(storeRepository.findById(121L)).thenReturn(Optional.of(testStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertFalse(hasAccess, "User 2 should NOT have access to Store 121 (not owner)");
    }
    
    /**
     * PLATFORM_ADMIN Test entfernt - nur Store-Owner haben Zugriff
     * (Wie vom User gefordert: Keine Rollen-Checks, nur Owner-Check)
     */
    // Test wurde entfernt
    
    @Test
    void testStoreNotFound_ShouldDenyAccess() {
        // Arrange
        Authentication auth = new UsernamePasswordAuthenticationToken(
            testUser.getEmail(), 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(999L)).thenReturn(Optional.empty());
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(999L);
        
        // Assert
        assertFalse(hasAccess, "Non-existent store should deny access");
    }
    
    @Test
    void testNotAuthenticated_ShouldDenyAccess() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(null);
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertFalse(hasAccess, "Unauthenticated user should be denied");
    }
    
    @Test
    void testUserNotFound_ShouldDenyAccess() {
        // Arrange
        Authentication auth = new UsernamePasswordAuthenticationToken(
            "nonexistent@example.com", 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertFalse(hasAccess, "Non-existent user email should be denied");
    }
    
    @Test
    void testStoreWithNullOwner_ShouldDenyAccess() {
        // Arrange
        Store orphanStore = new Store();
        orphanStore.setId(999L);
        orphanStore.setName("Orphan Store");
        orphanStore.setOwner(null);  // Kein Owner
        
        Authentication auth = new UsernamePasswordAuthenticationToken(
            testUser.getEmail(), 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(999L)).thenReturn(Optional.of(orphanStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(999L);
        
        // Assert
        assertFalse(hasAccess, "Store without owner should deny access");
    }
    
    /**
     * KRITISCHER TEST: Simuliert die Production-Situation
     * 
     * User: essoudati@hotmail.de (id=1)
     * Store: 121 (owner_id=1)
     * 
     * Dieser Test MUSS grün sein, damit die PayPal Admin-UI funktioniert!
     */
    @Test
    void testProductionScenario_User1_Store121() {
        // Arrange - EXAKT wie in Production
        User productionUser = new User();
        productionUser.setId(1L);
        productionUser.setEmail("essoudati@hotmail.de");
        productionUser.setName("Production User");
        productionUser.setRoles(Collections.singleton(Role.USER));
        
        Store productionStore = new Store();
        productionStore.setId(121L);
        productionStore.setName("Production Store");
        productionStore.setOwner(productionUser);  // User 1 ist Owner
        
        Authentication auth = new UsernamePasswordAuthenticationToken(
            productionUser.getEmail(), 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail("essoudati@hotmail.de")).thenReturn(Optional.of(productionUser));
        when(storeRepository.findById(121L)).thenReturn(Optional.of(productionStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertTrue(hasAccess, 
            "PRODUCTION TEST FAILED: User essoudati@hotmail.de (id=1) should have access to Store 121");
    }
    
    // ========== SECURITY FIX TESTS: Principal-Typ-Auswertung ==========
    
    /**
     * TEST 1: Principal ist User-Entity → Owner bekommt Zugriff
     * Dies ist der PRODUCTION-Fall, der den 403-Fehler verursacht hat!
     */
    @Test
    void testPrincipalIsUserEntity_OwnerShouldGetAccess() {
        // Arrange - Principal ist direkt das User-Entity-Objekt
        Authentication auth = new UsernamePasswordAuthenticationToken(
            testUser,  // Principal ist User-Entity, NICHT String!
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(storeRepository.findById(121L)).thenReturn(Optional.of(testStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertTrue(hasAccess, "User-Entity as Principal should grant access to owner");
        
        // Verify - User sollte NICHT über Repository geladen werden
        verify(userRepository, never()).findByEmail(anyString());
    }
    
    /**
     * TEST 2: Principal ist UserDetails → User wird über Username/E-Mail geladen
     */
    @Test
    void testPrincipalIsUserDetails_ShouldLoadFromRepository() {
        // Arrange - Principal ist Spring Security UserDetails
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
            .username(testUser.getEmail())
            .password("dummy")
            .authorities(Collections.emptyList())
            .build();
        
        Authentication auth = new UsernamePasswordAuthenticationToken(
            userDetails, 
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(121L)).thenReturn(Optional.of(testStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertTrue(hasAccess, "UserDetails principal should load user from repository");
        verify(userRepository).findByEmail(testUser.getEmail());
    }
    
    /**
     * TEST 3: Principal ist String/E-Mail → Fallback funktioniert
     */
    @Test
    void testPrincipalIsString_FallbackShouldWork() {
        // Arrange - Principal ist einfacher String (E-Mail)
        Authentication auth = new UsernamePasswordAuthenticationToken(
            testUser.getEmail(),  // Principal ist String
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(121L)).thenReturn(Optional.of(testStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertTrue(hasAccess, "String principal (email) should work as fallback");
        verify(userRepository).findByEmail(testUser.getEmail());
    }
    
    /**
     * TEST 4: User-Entity als Principal + fremder Store → false
     */
    @Test
    void testPrincipalIsUserEntity_NotOwnerShouldBeDenied() {
        // Arrange - User ist Principal, aber NICHT Owner des Stores
        User otherUser = new User();
        otherUser.setId(99L);
        otherUser.setEmail("other@example.com");
        otherUser.setRoles(Collections.singleton(Role.USER));
        
        Authentication auth = new UsernamePasswordAuthenticationToken(
            otherUser,  // Principal ist User-Entity, aber nicht Owner
            null, 
            Collections.emptyList()
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        when(storeRepository.findById(121L)).thenReturn(Optional.of(testStore));
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertFalse(hasAccess, "Non-owner user entity should be denied");
    }
    
    /**
     * TEST 5: AnonymousAuthenticationToken → false
     */
    @Test
    void testAnonymousAuthentication_ShouldBeDenied() {
        // Arrange - Anonymer User
        Authentication auth = new AnonymousAuthenticationToken(
            "anonymous", 
            "anonymousUser", 
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))
        );
        when(securityContext.getAuthentication()).thenReturn(auth);
        
        // Act
        boolean hasAccess = storeAccessChecker.isStoreAdmin(121L);
        
        // Assert
        assertFalse(hasAccess, "Anonymous user should be denied");
        
        // Verify - Keine Repository-Calls bei anonymous
        verify(userRepository, never()).findByEmail(anyString());
        verify(storeRepository, never()).findById(anyLong());
    }
    
    /**
     * TEST 6: SECURITY - Passwort-Hash erscheint nicht in toString()
     */
    @Test
    void testUserToString_ShouldNotExposePasswordHash() {
        // Arrange
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setName("Test User");
        user.setPasswordHash("$2a$10$SENSITIVE_HASH_VALUE");
        user.setRoles(Collections.singleton(Role.USER));
        user.setPreferredLanguage("de");
        
        // Act
        String userString = user.toString();
        
        // Assert
        assertNotNull(userString, "toString() should not be null");
        assertFalse(userString.contains("$2a$10$"), 
            "toString() MUST NOT expose password hash");
        assertFalse(userString.contains("SENSITIVE_HASH_VALUE"), 
            "toString() MUST NOT expose password hash");
        assertTrue(userString.contains("id=1"), 
            "toString() should contain id");
        assertTrue(userString.contains("email='test@example.com'"), 
            "toString() should contain email");
    }
}
