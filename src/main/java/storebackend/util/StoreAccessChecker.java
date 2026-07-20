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
                log.debug("StoreAccessCheck: No authenticated user");
                return false;
            }
            
            String email = auth.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                log.debug("StoreAccessCheck: User not found: {}", email);
                return false;
            }
            
            User user = userOpt.get();
            
            // PLATFORM_ADMIN hat Zugriff auf alle Stores
            if (user.getRoles().contains(Role.ROLE_PLATFORM_ADMIN)) {
                log.debug("StoreAccessCheck: User is PLATFORM_ADMIN - access granted");
                return true;
            }
            
            // Owner-Check
            Optional<Store> storeOpt = storeRepository.findById(storeId);
            if (storeOpt.isEmpty()) {
                log.debug("StoreAccessCheck: Store not found: {}", storeId);
                return false;
            }
            
            Store store = storeOpt.get();
            boolean isOwner = store.getOwner() != null && 
                              store.getOwner().getId().equals(user.getId());
            
            log.debug("StoreAccessCheck: storeId={}, userId={}, isOwner={}", 
                storeId, user.getId(), isOwner);
            
            return isOwner;
            
        } catch (Exception e) {
            log.error("StoreAccessCheck failed for storeId={}", storeId, e);
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

