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
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                log.info("[ACCESS-DENIED] No authenticated user for storeId={}", storeId);
                return false;
            }
            
            String email = auth.getName();
            log.info("[ACCESS-CHECK] Checking access for email={}, storeId={}", email, storeId);
            
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                log.warn("[ACCESS-DENIED] User not found: email={}, storeId={}", email, storeId);
                return false;
            }
            
            User user = userOpt.get();
            log.info("[ACCESS-CHECK] User found: userId={}, email={}, roles={}", 
                user.getId(), user.getEmail(), user.getRoles());
            
            // PLATFORM_ADMIN hat Zugriff auf alle Stores
            if (user.getRoles().contains(Role.ROLE_PLATFORM_ADMIN)) {
                log.info("[ACCESS-GRANTED] User is PLATFORM_ADMIN - userId={}, storeId={}", 
                    user.getId(), storeId);
                return true;
            }
            
            // Owner-Check
            Optional<Store> storeOpt = storeRepository.findById(storeId);
            if (storeOpt.isEmpty()) {
                log.warn("[ACCESS-DENIED] Store not found: storeId={}", storeId);
                return false;
            }
            
            Store store = storeOpt.get();
            Long ownerId = store.getOwner() != null ? store.getOwner().getId() : null;
            boolean isOwner = ownerId != null && ownerId.equals(user.getId());
            
            if (isOwner) {
                log.info("[ACCESS-GRANTED] User is owner: userId={}, storeId={}, ownerId={}", 
                    user.getId(), storeId, ownerId);
            } else {
                log.warn("[ACCESS-DENIED] User is NOT owner: userId={}, storeId={}, ownerId={}", 
                    user.getId(), storeId, ownerId);
            }
            
            return isOwner;
            
        } catch (Exception e) {
            log.error("[ACCESS-ERROR] StoreAccessCheck failed for storeId={}", storeId, e);
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

