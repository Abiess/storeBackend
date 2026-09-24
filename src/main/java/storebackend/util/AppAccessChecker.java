package storebackend.util;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;
import storebackend.enums.AppScope;
import storebackend.repository.UserAppEntitlementRepository;

import java.util.Optional;

/**
 * App-Entitlement-Konzept (Phase 1).
 *
 * Verantwortung: AUSSCHLIESSLICH App-ZUGRIFF ("darf dieser User diese App
 * überhaupt öffnen/nutzen?"). Bewusst getrennt von:
 * - {@link StoreAccessChecker}     -> Store-Zugriff (unverändert, nicht angefasst)
 * - {@code StoreRole.permissions}  -> fachliche Aktionen innerhalb einer App (unverändert)
 *
 * LEGACY/MANAGED gilt USERWEIT (nicht pro App), siehe {@link AppAccessMode}:
 * - LEGACY:  User hat gar keinen Entitlement-Eintrag -> Zugriff auf ALLE Apps
 *            bleibt wie bisher (true).
 * - MANAGED: User hat mindestens einen Entitlement-Eintrag -> für den
 *            GESAMTEN User zählt ab sofort nur noch die explizite
 *            Positivliste (enabled=true); fehlende App/fehlender Store
 *            oder enabled=false -> kein Zugriff.
 */
@Component
@RequiredArgsConstructor
public class AppAccessChecker {

    private final UserAppEntitlementRepository userAppEntitlementRepository;

    /**
     * Ermittelt den userweiten Zugriffsmodus (LEGACY/MANAGED).
     */
    public AppAccessMode getAccessMode(Long userId) {
        return userAppEntitlementRepository.existsByUserId(userId)
                ? AppAccessMode.MANAGED
                : AppAccessMode.LEGACY;
    }

    /**
     * Prüft, ob der User Zugriff auf die gegebene App (optional store-scoped) hat.
     *
     * @param userId  ID des Users
     * @param storeId storeId bei STORE-Scope-Apps, MUSS null sein bei GLOBAL-Scope-Apps
     * @param app     die zu prüfende App
     * @throws IllegalArgumentException bei Scope-Verletzung (storeId/AppScope passen nicht zusammen)
     */
    public boolean hasAppAccess(Long userId, Long storeId, AppKey app) {
        validateScope(app, storeId);

        if (getAccessMode(userId) == AppAccessMode.LEGACY) {
            return true;
        }

        Optional<UserAppEntitlement> entry = (storeId == null)
                ? userAppEntitlementRepository.findByUserIdAndAppAndStoreIdIsNull(userId, app)
                : userAppEntitlementRepository.findByUserIdAndAppAndStoreId(userId, app, storeId);

        return entry.map(UserAppEntitlement::isEnabled).orElse(false);
    }

    /**
     * Stellt die Scope-Konsistenz aus dem finalen Plan sicher:
     * - GLOBAL-Apps (MARITIME, ISSUE_ANALYSIS) MÜSSEN storeId == null haben.
     * - STORE-Apps (SHOP, DHL, LOYALTY) MÜSSEN storeId != null haben.
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
