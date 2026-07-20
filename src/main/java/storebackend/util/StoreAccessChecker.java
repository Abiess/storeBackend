package storebackend.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

            // 2. User aus Authentication laden (email als Identifier)
            String email = authentication.getName();
            
            User currentUser = userRepository.findByEmail(email).orElse(null);
            
            if (currentUser == null) {
                log.warn("[ACCESS-DENIED] User not found: email='{}', storeId={}", 
                    email, storeId);
                return false;
            }

            // 3. Store laden
            Store store = storeRepository.findById(storeId).orElse(null);
            
            if (store == null || store.getOwner() == null) {
                log.warn("[ACCESS-DENIED] Store not found or has no owner: storeId={}, userId={}", 
                    storeId, currentUser.getId());
                return false;
            }

            // 4. Owner-Check (direkter Vergleich der IDs)
            boolean isOwner = Objects.equals(store.getOwner().getId(), currentUser.getId());
            
            // 5. Debug-Logging
            log.info("[ACCESS-CHECK] storeId={}, authName='{}', currentUserId={}, ownerId={}, result={}",
                storeId,
                email,
                currentUser.getId(),
                store.getOwner().getId(),
                isOwner);
            
            if (isOwner) {
                log.info("[ACCESS-GRANTED] ✅ User is owner: userId={}, storeId={}, storeName='{}'", 
                    currentUser.getId(), storeId, store.getName());
            } else {
                log.warn("[ACCESS-DENIED] ❌ User is NOT owner: userId={}, ownerId={}, storeId={}",
                    currentUser.getId(), store.getOwner().getId(), storeId);
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

