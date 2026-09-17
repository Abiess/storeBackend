package storebackend.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.admin.AdminEntitlementDTO;
import storebackend.dto.admin.AdminStoreSummaryDTO;
import storebackend.dto.admin.AdminUserEntitlementsDTO;
import storebackend.dto.admin.AdminUserSummaryDTO;
import storebackend.dto.admin.UpsertEntitlementRequest;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;
import storebackend.enums.AppScope;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserAppEntitlementRepository;
import storebackend.repository.UserRepository;
import storebackend.util.AppAccessChecker;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * App Provisioning Phase 1 (Platform Administration) - dünner Service, der
 * AUSSCHLIESSLICH bestehende Bausteine wiederverwendet:
 * {@link UserAppEntitlementRepository}, {@link AppAccessChecker#getAccessMode(Long)},
 * {@link AppKey}/{@link AppScope}. KEINE neue Rolle, KEINE DB-Migration,
 * KEINE Änderung an {@code AppAccessChecker}/{@code AppAccessInterceptor}
 * (siehe ARCHITECTURE_APP_FACTORY.md Abschnitt 14/15).
 *
 * Sicherheitsgrenze: Zugriff auf ALLE Methoden ist ausschließlich über
 * {@code @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")} im Controller
 * ({@code AppProvisioningController}) abgesichert - dieser Service selbst
 * trifft keine Rollenentscheidung.
 */
@Service
@RequiredArgsConstructor
public class AppProvisioningService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final UserAppEntitlementRepository userAppEntitlementRepository;
    private final AppAccessChecker appAccessChecker;

    /**
     * Freitext-Suche über E-Mail/Name, bewusst ohne sensible Felder in der
     * Antwort (siehe {@link AdminUserSummaryDTO}).
     */
    @Transactional(readOnly = true)
    public List<AdminUserSummaryDTO> searchUsers(String query) {
        String q = query == null ? "" : query.trim();
        List<User> users = q.isEmpty()
                ? userRepository.findAll()
                : userRepository.findTop25ByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(q, q);
        return users.stream()
                .limit(25)
                .map(u -> new AdminUserSummaryDTO(
                        u.getId(),
                        u.getEmail(),
                        u.getName(),
                        appAccessChecker.getAccessMode(u.getId())
                ))
                .toList();
    }

    /**
     * Alle Entitlements eines Users (inkl. enabled=false - Soft-Disabled
     * Einträge müssen für die Admin-UI sichtbar bleiben, nicht nur die
     * aktiven), zusammen mit dem aktuellen, userweiten AppAccessMode.
     */
    @Transactional(readOnly = true)
    public AdminUserEntitlementsDTO getUserEntitlements(Long userId) {
        User user = requireUser(userId);
        List<AdminEntitlementDTO> entitlements = userAppEntitlementRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .toList();
        AppAccessMode mode = appAccessChecker.getAccessMode(userId);
        return new AdminUserEntitlementsDTO(user.getId(), user.getEmail(), mode, entitlements);
    }

    /**
     * Upsert eines Entitlements (App + optionaler Store). Legt einen neuen
     * Datensatz an oder aktualisiert {@code enabled}, falls für
     * (user, app, storeId) bereits ein Eintrag existiert (nutzt dieselben
     * Lookup-Methoden wie {@code AppAccessChecker}, um Duplikate zu
     * vermeiden - die eigentliche Unique-Garantie bleibt weiterhin
     * DB-seitig, siehe Migration V025).
     *
     * WICHTIG (LEGACY→MANAGED): Legt dies den ERSTEN Entitlement-Datensatz
     * für einen bislang LEGACY-User an, wechselt der User ab sofort
     * user-weit auf MANAGED (siehe {@link AppAccessChecker#getAccessMode}).
     * Das Frontend MUSS den User vor dem Aufruf dieser Methode explizit
     * warnen (siehe ARCHITECTURE_APP_FACTORY.md Abschnitt 14/15) - der
     * Service selbst verweigert das Anlegen nicht, da es eine bewusste
     * Admin-Entscheidung ist.
     */
    @Transactional
    public AdminEntitlementDTO upsertEntitlement(Long userId, UpsertEntitlementRequest request) {
        User user = requireUser(userId);
        AppKey app = request.getApp();
        if (app == null) {
            throw new IllegalArgumentException("app ist erforderlich.");
        }
        validateScope(app, request.getStoreId());

        Store store = null;
        if (request.getStoreId() != null) {
            store = storeRepository.findById(request.getStoreId())
                    .orElseThrow(() -> new NoSuchElementException("Store " + request.getStoreId() + " nicht gefunden."));
        }

        Optional<UserAppEntitlement> existing = (request.getStoreId() == null)
                ? userAppEntitlementRepository.findByUserIdAndAppAndStoreIdIsNull(userId, app)
                : userAppEntitlementRepository.findByUserIdAndAppAndStoreId(userId, app, request.getStoreId());

        UserAppEntitlement entitlement = existing.orElseGet(UserAppEntitlement::new);
        entitlement.setUser(user);
        entitlement.setApp(app);
        entitlement.setStore(store);
        entitlement.setEnabled(request.isEnabled());

        UserAppEntitlement saved = userAppEntitlementRepository.save(entitlement);
        return toDto(saved);
    }

    /**
     * Soft-Disable/-Enable eines bestehenden Entitlements (nur das
     * {@code enabled}-Flag) - bevorzugt gegenüber physischem DELETE,
     * konsistent mit dem bestehenden Soft-Delete-Pattern der Entity.
     */
    @Transactional
    public AdminEntitlementDTO patchEnabled(Long userId, Long entitlementId, boolean enabled) {
        requireUser(userId);
        UserAppEntitlement entitlement = userAppEntitlementRepository.findById(entitlementId)
                .orElseThrow(() -> new NoSuchElementException("Entitlement " + entitlementId + " nicht gefunden."));
        if (!entitlement.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Entitlement " + entitlementId + " gehört nicht zu User " + userId + ".");
        }
        entitlement.setEnabled(enabled);
        UserAppEntitlement saved = userAppEntitlementRepository.save(entitlement);
        return toDto(saved);
    }

    /**
     * Store-Liste für die Context-Auswahl (STORE-scoped Apps). Bewusst
     * keine neue Tenant-/Context-Abstraktion - nur eine schlanke Projektion
     * der bestehenden {@code Store}-Entity.
     */
    @Transactional(readOnly = true)
    public List<AdminStoreSummaryDTO> searchStores(String query) {
        String q = query == null ? "" : query.trim();
        List<Store> stores = q.isEmpty()
                ? storeRepository.findAll()
                : storeRepository.findTop50ByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(q, q);
        return stores.stream()
                .limit(50)
                .map(s -> new AdminStoreSummaryDTO(
                        s.getId(),
                        s.getName(),
                        s.getSlug(),
                        s.getOwner() != null ? s.getOwner().getEmail() : null,
                        s.getBusinessType()
                ))
                .toList();
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User " + userId + " nicht gefunden."));
    }

    private AdminEntitlementDTO toDto(UserAppEntitlement e) {
        return new AdminEntitlementDTO(
                e.getId(),
                e.getApp(),
                e.getApp().getScope(),
                e.getStore() != null ? e.getStore().getId() : null,
                e.getStore() != null ? e.getStore().getName() : null,
                e.isEnabled(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    /**
     * Identische Regel wie {@code AppAccessChecker.validateScope} (bewusst
     * dupliziert statt dort eine Methode public zu machen - AppAccessChecker
     * bleibt laut Auftrag komplett unangetastet):
     * - STORE-Apps (SHOP, DHL, LOYALTY) benötigen eine storeId.
     * - GLOBAL-Apps (MARITIME, ISSUE_ANALYSIS) dürfen keine storeId haben.
     */
    private void validateScope(AppKey app, Long storeId) {
        if (app.getScope() == AppScope.GLOBAL && storeId != null) {
            throw new IllegalArgumentException(
                    "App " + app + " ist GLOBAL-scoped und darf keiner storeId zugeordnet werden (storeId muss null sein).");
        }
        if (app.getScope() == AppScope.STORE && storeId == null) {
            throw new IllegalArgumentException(
                    "App " + app + " ist STORE-scoped und benötigt eine storeId (storeId darf nicht null sein).");
        }
    }
}
