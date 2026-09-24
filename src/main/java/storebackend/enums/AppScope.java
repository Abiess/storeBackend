package storebackend.enums;

/**
 * Scope eines {@link AppKey}: legt fest, ob eine App store-gebunden
 * oder plattformweit (global) betrieben wird.
 *
 * Wird ausschließlich zur Konsistenzprüfung von {@link storebackend.entity.UserAppEntitlement}
 * verwendet (Phase 1 App-Entitlement-Konzept):
 * - STORE  -> Entitlement MUSS eine storeId besitzen (store_id NOT NULL)
 * - GLOBAL -> Entitlement DARF keine storeId besitzen (store_id NULL)
 */
public enum AppScope {
    STORE,
    GLOBAL
}
