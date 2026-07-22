package storebackend.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.Objects;

/**
 * Spring Bean für Store-Access-Checks in @PreAuthorize SpEL-Expressions
 */
@Component("storeAccessChecker")
@RequiredArgsConstructor
@Slf4j
public class StoreAccessChecker {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    /**
     * Prüft, ob der aktuell eingeloggte User Admin-Rechte für einen Store hat
     * (Owner des Stores).
     * 
     * SECURITY FIX: Unterstützt jetzt verschiedene Principal-Typen:
     * - User-Entity (direkt)
     * - UserDetails (Username wird als E-Mail verwendet)
     * - String/E-Mail (Fallback)
     * 
     * Für @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
     * 
     * @param storeId Store ID
     * @return true wenn User Owner ist, sonst false
     */
    public boolean isStoreAdmin(Long storeId) {
        try {
            // 1. Authentication prüfen
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
                log.warn("[ACCESS-DENIED] Not authenticated for storeId={}", storeId);
                return false;
            }

            // 2. User aus Principal laden - SECURITY FIX: Principal-Typ auswerten
            User currentUser = null;
            Object principal = authentication.getPrincipal();
            
            if (principal instanceof User authenticatedUser) {
                // Principal ist bereits ein User-Entity-Objekt
                currentUser = authenticatedUser;
                log.debug("[PRINCIPAL] Type: User entity, userId={}", currentUser.getId());
            } else if (principal instanceof UserDetails userDetails) {
                // Principal ist UserDetails → Username als E-Mail verwenden
                currentUser = userRepository
                    .findByEmail(userDetails.getUsername())
                    .orElse(null);
                log.debug("[PRINCIPAL] Type: UserDetails, username={}", userDetails.getUsername());
            } else {
                // Fallback: authentication.getName() als E-Mail
                String identifier = authentication.getName();
                currentUser = userRepository
                    .findByEmail(identifier)
                    .orElse(null);
                log.debug("[PRINCIPAL] Type: String/fallback, name={}", identifier);
            }
            
            if (currentUser == null) {
                log.warn("[ACCESS-DENIED] Authenticated user could not be resolved, storeId={}", storeId);
                return false;
            }

            // 3. Store laden (MIT Owner wegen Lazy Loading!)
            Store store = storeRepository.findByIdWithOwner(storeId).orElse(null);
            
            if (store == null || store.getOwner() == null) {
                log.warn("[ACCESS-DENIED] Store not found or has no owner: storeId={}, userId={}", 
                    storeId, currentUser.getId());
                return false;
            }

            // 4. Owner-Check (direkter Vergleich der IDs)
            Long userId = currentUser.getId();
            Long ownerId = store.getOwner().getId();
            boolean isOwner = Objects.equals(userId, ownerId);
            
            // 5. SECURITY: Nur IDs und notwendige Infos loggen - NIE den Principal oder User-Objekt!
            log.info("[ACCESS-CHECK] storeId={}, currentUserId={}, ownerId={}, result={}",
                storeId,
                userId,
                ownerId,
                isOwner);
            
            if (isOwner) {
                log.info("[ACCESS-GRANTED] ✅ User is owner: userId={}, storeId={}, storeName='{}'", 
                    userId, storeId, store.getName());
            } else {
                log.warn("[ACCESS-DENIED] ❌ User is NOT owner: userId={}, ownerId={}, storeId={}",
                    userId, ownerId, storeId);
            }
            
            return isOwner;
            
        } catch (Exception e) {
            log.error("[ACCESS-ERROR] StoreAccessCheck failed for storeId={}: {}", 
                storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Statische Utility-Methode: Prüft, ob ein User der Owner eines Stores ist.
     * Behandelt null-Werte sicher.
     *
     * @param store Der Store
     * @param user Der User
     * @return true, wenn der User der Owner ist, sonst false
     */
    public static boolean isOwner(Store store, User user) {
        if (store == null || user == null) {
            return false;
        }

        if (store.getOwner() == null) {
            return false;
        }

        if (user.getId() == null || store.getOwner().getId() == null) {
            return false;
        }

        return Objects.equals(store.getOwner().getId(), user.getId());
    }

    /**
     * Statische Utility-Methode: Prüft, ob der Store einen Owner hat.
     *
     * @param store Der Store
     * @return true, wenn der Store einen Owner hat, sonst false
     */
    public static boolean hasOwner(Store store) {
        return store != null && store.getOwner() != null && store.getOwner().getId() != null;
    }
}

