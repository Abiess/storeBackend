package storebackend.enums;

/**
 * App-Entitlement-Konzept (Phase 1) - fachliche Apps der Plattform.
 *
 * WICHTIG: Dies ist ausschließlich für den App-ZUGRIFF ("darf dieser User
 * diese App überhaupt öffnen?") gedacht - NICHT für fachliche Berechtigungen
 * innerhalb einer App (das bleibt weiterhin {@link storebackend.entity.StoreRole#getPermissionList()})
 * und NICHT für Store-Zugriff (das bleibt {@code StoreAccessChecker}).
 *
 * Jede App hat einen festen {@link AppScope}, der zentral hier definiert ist,
 * damit nicht an mehreren Stellen im Code hart codiert werden muss, ob eine
 * App eine storeId benötigt:
 * - SHOP, DHL, LOYALTY      -> STORE  (bestehende, store-gebundene Features)
 * - MARITIME                -> GLOBAL (bereits heute nicht store-gebunden, siehe MaritimeController)
 * - ISSUE_ANALYSIS          -> GLOBAL (aktuell nur Feasibility-Spike ohne Store-Bezug,
 *                                      siehe IssueAnalysisTestController)
 * - DOCUMENTS               -> GLOBAL (persönlicher Dokumenten-Tresor, rein user-privat,
 *                                      bewusst OHNE storeId/Store-Bezug - siehe DocumentController
 *                                      und ARCHITECTURE_APP_FACTORY.md Abschnitt "DOCUMENTS")
 */
public enum AppKey {
    SHOP(AppScope.STORE),
    DHL(AppScope.STORE),
    LOYALTY(AppScope.STORE),
    MARITIME(AppScope.GLOBAL),
    ISSUE_ANALYSIS(AppScope.GLOBAL),
    DOCUMENTS(AppScope.GLOBAL);

    private final AppScope scope;

    AppKey(AppScope scope) {
        this.scope = scope;
    }

    public AppScope getScope() {
        return scope;
    }
}
