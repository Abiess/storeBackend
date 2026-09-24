package storebackend.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.StoreRoleRepository;
import storebackend.repository.UserRepository;

import jakarta.persistence.PersistenceException;
import org.hibernate.HibernateException;
import java.sql.SQLException;
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
    private final StoreRoleRepository storeRoleRepository;

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
            // 1. User resolven
            User currentUser = resolveCurrentUser();
            
            if (currentUser == null) {
                log.warn("[ACCESS-DENIED] Not authenticated for storeId={}", storeId);
                return false;
            }

            // 2. Store laden (MIT Owner wegen Lazy Loading!)
            Store store = storeRepository.findByIdWithOwner(storeId).orElse(null);
            
            if (store == null || store.getOwner() == null) {
                log.warn("[ACCESS-DENIED] Store not found or has no owner: storeId={}, userId={}", 
                    storeId, currentUser.getId());
                return false;
            }

            // 3. Owner-Check (direkter Vergleich der IDs)
            Long userId = currentUser.getId();
            Long ownerId = store.getOwner().getId();
            boolean isOwner = Objects.equals(userId, ownerId);
            
            // 4. SECURITY: Nur IDs und notwendige Infos loggen - NIE den Principal oder User-Objekt!
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
            rethrowIfTechnicalFailure(e);
            log.error("[ACCESS-ERROR] StoreAccessCheck failed for storeId={}: {}", 
                storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Prüft, ob der aktuell eingeloggte User Zugriff auf einen Store hat.
     * Zugriff = Owner ODER Team-Mitglied (hat StoreRole).
     * 
     * Für @PreAuthorize("@storeAccessChecker.hasStoreAccess(#storeId)")
     * Verwendet für GET /api/stores/{storeId} und allgemeine Store-Reads.
     * 
     * @param storeId Store ID
     * @return true wenn User Owner ODER Team-Mitglied ist, sonst false
     */
    public boolean hasStoreAccess(Long storeId) {
        try {
            // 1. User resolven (gleiche Logik wie isStoreAdmin)
            User currentUser = resolveCurrentUser();
            if (currentUser == null) {
                log.warn("[ACCESS-DENIED] Not authenticated for storeId={}", storeId);
                return false;
            }
            
            Long userId = currentUser.getId();
            
            // 2. Store laden (MIT Owner wegen Lazy Loading!)
            Store store = storeRepository.findByIdWithOwner(storeId).orElse(null);
            
            if (store == null) {
                log.warn("[ACCESS-DENIED] Store not found: storeId={}, userId={}", storeId, userId);
                return false;
            }

            // 3. Owner-Check (direkt)
            boolean isOwner = store.getOwner() != null && 
                              Objects.equals(userId, store.getOwner().getId());
            
            if (isOwner) {
                log.info("[ACCESS-GRANTED] ✅ User is owner: userId={}, storeId={}", userId, storeId);
                return true;
            }
            
            // 4. StoreRole-Check (Team-Mitglied)
            // MULTI-TENANT SECURITY: storeId ist WHERE-Bedingung!
            boolean hasRole = storeRoleRepository.existsByStoreIdAndUserId(storeId, userId);
            
            if (hasRole) {
                log.info("[ACCESS-GRANTED] ✅ User is team member: userId={}, storeId={}", userId, storeId);
                return true;
            }
            
            // 5. Kein Zugriff
            log.warn("[ACCESS-DENIED] ❌ User is neither owner nor team member: userId={}, storeId={}", 
                    userId, storeId);
            return false;
            
        } catch (Exception e) {
            rethrowIfTechnicalFailure(e);
            log.error("[ACCESS-ERROR] hasStoreAccess failed for storeId={}: {}", 
                    storeId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * REGRESSION-FIX: Ein echter "kein Zugriff"-Check darf false liefern.
     * Ein technischer DB-/SQL-/Hibernate-Fehler ist KEIN Access-Denied und
     * darf nicht stillschweigend zu false (-> 403) degradiert werden, sonst
     * werden Schemafehler fälschlich als "Access Denied" dargestellt.
     *
     * Prüft, ob die übergebene Exception (oder eine ihrer Ursachen) ein
     * technischer Datenzugriffsfehler ist, und wirft sie in diesem Fall
     * unverändert weiter (-> Spring Error Handling -> 500).
     */
    private void rethrowIfTechnicalFailure(Exception e) {
        Throwable current = e;
        while (current != null) {
            if (current instanceof DataAccessException
                || current instanceof PersistenceException
                || current instanceof HibernateException
                || current instanceof SQLException) {
                if (e instanceof RuntimeException re) {
                    throw re;
                }
                throw new IllegalStateException("Technical failure during store access check", e);
            }
            current = current.getCause();
        }
    }

    /**
     * Extrahiert den aktuell eingeloggten User aus dem SecurityContext.
     * Wiederverwendbare Hilfsmethode für isStoreAdmin() und hasStoreAccess().
     * 
     * @return User-Entity oder null
     */
    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        
        if (principal instanceof User authenticatedUser) {
            return authenticatedUser;
        } else if (principal instanceof UserDetails userDetails) {
            return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        } else {
            String identifier = authentication.getName();
            return userRepository.findByEmail(identifier).orElse(null);
        }
    }

    /**
     * Prüft, ob der aktuell eingeloggte User eine spezifische Permission für einen Store hat.
     * 
     * MULTI-TENANT SECURITY:
     * - Owner hat implizit ALLE Permissions für seinen Store
     * - Team-Mitglied braucht StoreRole mit exaktem (storeId, userId)
     * - Permission muss in StoreRole.permissions enthalten sein
     * - Wildcard "*" = alle Permissions
     * 
     * Für @PreAuthorize("@storeAccessChecker.hasPermission(#storeId, 'PRODUCT_UPDATE')")
     * oder direkten Aufruf im Controller.
     * 
     * @param storeId Store ID
     * @param permission Permission-String (z.B. "PRODUCT_UPDATE", "ORDER_READ")
     * @return true wenn User Permission hat, sonst false
     */
    public boolean hasPermission(Long storeId, String permission) {
        try {
            // 1. User resolven
            User currentUser = resolveCurrentUser();
            if (currentUser == null) {
                log.warn("[PERMISSION-DENIED] Not authenticated for storeId={}, permission={}", 
                    storeId, permission);
                return false;
            }
            
            Long userId = currentUser.getId();
            
            // 2. Store laden (MIT Owner!)
            Store store = storeRepository.findByIdWithOwner(storeId).orElse(null);
            if (store == null || store.getOwner() == null) {
                log.warn("[PERMISSION-DENIED] Store not found or has no owner: storeId={}, userId={}", 
                    storeId, userId);
                return false;
            }
            
            // 3. Owner hat implizit ALLE Permissions
            boolean isOwner = Objects.equals(userId, store.getOwner().getId());
            if (isOwner) {
                log.info("[PERMISSION-GRANTED] ✅ Owner has implicit permission: userId={}, storeId={}, permission={}", 
                    userId, storeId, permission);
                return true;
            }
            
            // 4. Team-Mitglied: StoreRole mit Permission prüfen
            // MULTI-TENANT SECURITY: storeId UND userId in WHERE-Bedingung!
            var roleOpt = storeRoleRepository.findByStoreIdAndUserId(storeId, userId);
            
            if (roleOpt.isEmpty()) {
                log.warn("[PERMISSION-DENIED] ❌ User is not a team member: userId={}, storeId={}, permission={}", 
                    userId, storeId, permission);
                return false;
            }
            
            var role = roleOpt.get();
            var permissions = role.getPermissionList();
            
            // 5. Wildcard "*" = alle Permissions
            if (permissions.contains("*")) {
                log.info("[PERMISSION-GRANTED] ✅ User has wildcard permission: userId={}, storeId={}, role={}, permission={}", 
                    userId, storeId, role.getRole(), permission);
                return true;
            }
            
            // 6. Konkrete Permission prüfen
            boolean hasPermission = permissions.contains(permission);
            
            if (hasPermission) {
                log.info("[PERMISSION-GRANTED] ✅ User has specific permission: userId={}, storeId={}, role={}, permission={}", 
                    userId, storeId, role.getRole(), permission);
            } else {
                log.warn("[PERMISSION-DENIED] ❌ User lacks permission: userId={}, storeId={}, role={}, availablePermissions={}, requiredPermission={}", 
                    userId, storeId, role.getRole(), permissions, permission);
            }
            
            return hasPermission;
            
        } catch (Exception e) {
            rethrowIfTechnicalFailure(e);
            log.error("[PERMISSION-ERROR] Permission check failed for storeId={}, permission={}: {}", 
                storeId, permission, e.getMessage(), e);
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

