package storebackend.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.Optional;

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
     * (Owner oder PLATFORM_ADMIN).
     * 
     * Für @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
     * 
     * @param storeId Store ID
     * @return true wenn User Admin-Rechte hat, sonst false
     */
    public boolean isStoreAdmin(Long storeId) {
        try {
            // 1. Authentication prüfen
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                log.warn("[ACCESS-DENIED] No authenticated user for storeId={}", storeId);
                return false;
            }
            
            // 2. User aus Authentication laden
            String authName = auth.getName();
            log.info("[ACCESS-CHECK] auth.getName()='{}', storeId={}", authName, storeId);
            
            Optional<User> userOpt = userRepository.findByEmail(authName);
            if (userOpt.isEmpty()) {
                log.warn("[ACCESS-DENIED] User not found in DB: authName='{}', storeId={}", 
                    authName, storeId);
                return false;
            }
            
            User user = userOpt.get();
            log.info("[ACCESS-CHECK] User loaded: userId={}, email='{}', roles={}", 
                user.getId(), user.getEmail(), user.getRoles());
            
            // 3. PLATFORM_ADMIN hat Zugriff auf alle Stores
            if (user.getRoles() != null && user.getRoles().contains(Role.ROLE_PLATFORM_ADMIN)) {
                log.info("[ACCESS-GRANTED] ✅ PLATFORM_ADMIN: userId={}, storeId={}", 
                    user.getId(), storeId);
                return true;
            }
            
            // 4. Store laden
            Optional<Store> storeOpt = storeRepository.findById(storeId);
            if (storeOpt.isEmpty()) {
                log.warn("[ACCESS-DENIED] Store not found: storeId={}", storeId);
                return false;
            }
            
            Store store = storeOpt.get();
            
            // 5. Owner-Check (KRITISCH für PayPal Admin UI)
            if (store.getOwner() == null) {
                log.warn("[ACCESS-DENIED] Store has NO owner: storeId={}, userId={}", 
                    storeId, user.getId());
                return false;
            }
            
            Long userId = user.getId();
            Long ownerId = store.getOwner().getId();
            
            log.info("[ACCESS-CHECK] Ownership comparison: userId={}, storeOwnerId={}, storeId={}", 
                userId, ownerId, storeId);
            
            boolean isOwner = ownerId != null && userId != null && ownerId.equals(userId);
            
            if (isOwner) {
                log.info("[ACCESS-GRANTED] ✅ User is owner: userId={}, storeId={}, storeName='{}'", 
                    userId, storeId, store.getName());
            } else {
                log.warn("[ACCESS-DENIED] ❌ User is NOT owner: userId={}, storeId={}, storeOwnerId={}, storeName='{}'", 
                    userId, storeId, ownerId, store.getName());
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

        return store.getOwner().getId().equals(user.getId());
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

