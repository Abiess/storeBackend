package storebackend.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
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
}
