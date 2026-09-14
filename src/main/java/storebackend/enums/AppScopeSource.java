package storebackend.enums;

/**
 * Phase 3 (Backend App-Isolation).
 *
 * Legt EXPLIZIT fest, wie der {@code storeId}-Scope für eine mit
 * {@code @RequiresApp} annotierte Methode/Klasse aufgelöst werden muss.
 *
 * WICHTIG (expliziter Sicherheitsgrundsatz): Der Interceptor darf sich
 * NIEMALS stillschweigend auf einen Pfad-Parameter namens "storeId" verlassen.
 * Jede {@code @RequiresApp}-Verwendung MUSS explizit angeben, woher der
 * Scope kommt - andernfalls muss die Auflösung fehlschlagen und der Zugriff
 * verweigert werden (deny-by-default), niemals stillschweigend erlaubt werden.
 */
public enum AppScopeSource {

    /** storeId steht direkt als Pfad-Parameter zur Verfügung (Standardfall). */
    STORE_ID_PARAM,

    /** storeId muss über eine Order (orderId Pfad-Parameter -> Order.store.id) aufgelöst werden. */
    ORDER_ID_PARAM,

    /** storeId muss über ein DhlParcel (parcelId Pfad-Parameter -> DhlParcel.store.id) aufgelöst werden. */
    DHL_PARCEL_ID_PARAM,

    /** storeId muss über einen DhlShelfSlot (slotId Pfad-Parameter -> DhlShelfSlot.store.id) aufgelöst werden. */
    DHL_SLOT_ID_PARAM,

    /** Ausschließlich für GLOBAL-scoped Apps (kein storeId, Scope ist der gesamte User). */
    NONE
}
