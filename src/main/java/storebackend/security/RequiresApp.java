package storebackend.security;

import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Phase 3 (Backend App-Isolation).
 *
 * Markiert einen Controller (Klassenebene) oder eine einzelne Methode als
 * Teil einer bestimmten App. {@link AppAccessInterceptor} liest diese
 * Annotation und erzwingt zusätzlich zur bestehenden Security (Auth/JWT,
 * StoreAccessChecker, StoreRole.permissions) den serverseitigen
 * App-Zugriff über {@link storebackend.util.AppAccessChecker} (Phase 1).
 *
 * Architektur (siehe Auftrag):
 * <pre>
 * Auth/JWT -&gt; @RequiresApp / AppAccessInterceptor (App-Zugriff)
 *          -&gt; bestehender StoreAccessChecker / Rollen / Permissions
 *          -&gt; Businesslogik
 * </pre>
 *
 * WICHTIG:
 * <ul>
 *   <li>NICHT auf öffentliche (permitAll) Endpunkte setzen - siehe SecurityConfig.
 *       Endpunkte ohne diese Annotation bleiben vom Interceptor unberührt und
 *       verhalten sich exakt wie vor Phase 3 (PLATFORM_SHARED/PUBLIC).</li>
 *   <li>Bei Controllern mit gemischtem Enforcement (z.B. öffentliche GET +
 *       geschützte POST/PUT/DELETE) MUSS die Annotation auf der jeweiligen
 *       Methode sitzen, NICHT auf der Klasse.</li>
 *   <li>{@code scope} MUSS explizit angegeben werden, sobald der Standard
 *       (STORE_ID_PARAM, Pfad-Parameter "storeId") nicht zutrifft -
 *       insbesondere bei GLOBAL-Apps ({@code scope = AppScopeSource.NONE})
 *       oder bei Ressourcen, die storeId nicht direkt im Pfad tragen.</li>
 *   <li>Kann der angegebene Scope nicht aufgelöst werden (fehlender/ungültiger
 *       Pfad-Parameter, referenzierte Ressource nicht gefunden), wird IMMER
 *       verweigert - niemals stillschweigend erlaubt.</li>
 * </ul>
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresApp {

    /** Die App, zu der dieser Endpunkt gehört. */
    AppKey value();

    /** Wie der storeId-Scope aufgelöst werden muss (siehe {@link AppScopeSource}). */
    AppScopeSource scope() default AppScopeSource.STORE_ID_PARAM;

    /**
     * Optionaler Name des Pfad-Parameters, falls er vom Standard je Scope
     * abweicht ("storeId" / "orderId" / "parcelId" / "slotId").
     */
    String paramName() default "";
}
