import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AppContextService } from './app-context.service';
import { AppAccessMode, AppKey } from '../models';
import { APP_REGISTRY, APP_REGISTRY_ORDER } from '../config/app-registry';

/**
 * App-Entitlement Phase 2 (Frontend-Durchsetzung).
 *
 * Liest ausschließlich `appAccessMode` aus dem bereits vorhandenen
 * `AuthService.getCurrentUser()` (Backend Phase 1) sowie die aufbereiteten
 * Entitlements aus `AppContextService` (keine doppelte Auswertung der
 * `apps`-Liste). Es wird KEINE neue Auth-/Permission-Infrastruktur
 * aufgebaut – dieser Service ist nur die Klassifizierung "welche App gehört
 * zu dieser URL" + "darf der User dahin" + "wohin soll er primär geleitet
 * werden" (Login-Redirect, App-Launcher, App-Switcher).
 *
 * Verhalten:
 * - Kein User / `appAccessMode` fehlt / `LEGACY` → alles wie bisher erlaubt.
 * - `MANAGED` → nur explizit `enabled=true` passende (app, storeId) Einträge
 *   erlauben Zugriff auf app-spezifische Routen. Nicht klassifizierte
 *   ("neutrale") Routen (Login, Profil/Einstellungen, rechtliche Seiten,
 *   Storefront usw.) bleiben immer erreichbar.
 */
type UrlClassification =
  | { kind: 'neutral' }
  | { kind: 'app'; app: AppKey; storeId: number | null };

@Injectable({ providedIn: 'root' })
export class AppAccessService {
  private authService = inject(AuthService);
  private appContextService = inject(AppContextService);

  isManaged(): boolean {
    return this.authService.getCurrentUser()?.appAccessMode === AppAccessMode.MANAGED;
  }

  /**
   * Klassifiziert eine URL anhand des bereits vorhandenen Routing-Schemas
   * (`/stores/:id/dhl` [Legacy-Alias], `/apps/dhl/:id` [app-zentrisch],
   * `/stores/:id/loyalty`, `/tools/maritime`, ...).
   * Alles, was hier nicht eindeutig einer App zugeordnet werden kann, gilt
   * bewusst als "neutral" (immer erlaubt), um bestehende Abläufe (Login,
   * Legal-Seiten, Storefront, Profil) nicht versehentlich zu blockieren.
   *
   * WICHTIG: Dies ist reine Web-Navigations-Klassifizierung (welche
   * Angular-Route gehört zu welcher App), KEINE Zugriffsentscheidung.
   * Die eigentliche Autorisierungsregel (welche App/Store ein User nutzen
   * darf) stammt unverändert aus dem Backend (`AppAccessChecker` +
   * `apps`-Liste im Login-Response) und ist damit auch für künftige
   * iOS-/Android-Clients identisch nutzbar, ohne dass die URL-Zuordnung
   * hier nachgebaut werden müsste (die brauchen nur `apps`/`appAccessMode`).
   */
  private classifyUrl(url: string): UrlClassification {
    const path = (url || '').split('?')[0].split('#')[0];

    // App-zentrische DHL-Route: /apps/dhl/:storeId(/...)
    // Hinweis: ":storeId" ist hier weiterhin der bestehende technische
    // Mandanten-/Datenkontext des DHL-Backends – bewusst NICHT umbenannt,
    // damit später ohne Breaking-Change auf tenantId/locationId gewechselt
    // werden kann, sobald das DHL-Backend das anbietet.
    const appsDhlMatch = path.match(/^\/apps\/dhl(?:\/(\d+))?(\/.*)?$/);
    if (appsDhlMatch) {
      const storeId = appsDhlMatch[1] != null ? Number(appsDhlMatch[1]) : null;
      return { kind: 'app', app: AppKey.DHL, storeId };
    }

    // App-zentrische LOYALTY-Route: /apps/loyalty/:storeId(/...) – analog DHL,
    // zweiter STORE-scoped Beweis für die generische App-Factory-Struktur.
    const appsLoyaltyMatch = path.match(/^\/apps\/loyalty(?:\/(\d+))?(\/.*)?$/);
    if (appsLoyaltyMatch) {
      const storeId = appsLoyaltyMatch[1] != null ? Number(appsLoyaltyMatch[1]) : null;
      return { kind: 'app', app: AppKey.LOYALTY, storeId };
    }

    const storeMatch = path.match(/^\/stores\/(\d+)(\/.*)?$/);
    if (storeMatch) {
      const storeId = Number(storeMatch[1]);
      const rest = storeMatch[2] || '';
      if (rest.startsWith('/dhl')) {
        // Legacy-Alias – bleibt vorerst unverändert funktionsfähig.
        return { kind: 'app', app: AppKey.DHL, storeId };
      }
      if (rest.startsWith('/loyalty')) {
        return { kind: 'app', app: AppKey.LOYALTY, storeId };
      }
      // Alle übrigen Store-Unterseiten (Produkte, POS, Einstellungen, ...) = SHOP
      return { kind: 'app', app: AppKey.SHOP, storeId };
    }

    if (path === '/dashboard' || path === '/store-wizard') {
      return { kind: 'app', app: AppKey.SHOP, storeId: null };
    }

    // Generische GLOBAL-App-Erkennung: JEDE App mit `scope: 'GLOBAL'` wird
    // ausschließlich über ihre `AppRegistry`-Metadaten (`baseRoute` +
    // optionaler `legacyBasePath`) erkannt. Eine neue GLOBAL-App (z.B.
    // FLEET) benötigt dadurch KEINE Änderung an dieser Klassifizierung –
    // ein zusätzlicher `APP_REGISTRY`-Eintrag genügt.
    for (const key of APP_REGISTRY_ORDER) {
      const entry = APP_REGISTRY[key];
      if (entry.scope !== 'GLOBAL') continue;
      if (path.startsWith(entry.baseRoute) || (entry.legacyBasePath && path.startsWith(entry.legacyBasePath))) {
        return { kind: 'app', app: key, storeId: null };
      }
    }

    return { kind: 'neutral' };
  }

  private hasEntitlement(app: AppKey, storeId: number | null): boolean {
    const contexts = this.appContextService.getContexts(app);
    if (storeId == null) {
      // Globale Apps (Context immer `null`) ODER die "bare" App-Route ohne
      // konkreten Context (z.B. `/apps/dhl` → Context-Auswahl): es reicht,
      // dass IRGENDEIN aktiver Context existiert.
      return contexts.length > 0;
    }
    return contexts.some(c => c.contextId === String(storeId));
  }

  /** Prüft, ob die aktuell eingeloggte Person (im Frontend) auf diese URL darf. */
  isUrlAllowed(url: string): boolean {
    if (!this.isManaged()) {
      return true; // LEGACY (oder unbekannt) → unverändertes bisheriges Verhalten
    }

    const cls = this.classifyUrl(url);
    if (cls.kind === 'neutral') {
      return true;
    }
    return this.hasEntitlement(cls.app, cls.storeId);
  }

  /** Prüft, ob ein bestimmter Sidebar-Navigationspunkt (Route) sichtbar sein darf. */
  isRouteAllowed(route: string | undefined): boolean {
    if (!route) return true;
    return this.isUrlAllowed(route);
  }

  /**
   * Konkrete Ziel-URL einer App für einen bestimmten Context (z.B. Store).
   * Öffentlich, damit App-Launcher/Context-Auswahl dieselbe, einzige Quelle
   * für App-Routing nutzen (keine Duplikation der Pfad-Muster pro App).
   */
  buildAppHomeUrl(app: AppKey, storeId: number | null): string {
    const registryEntry = APP_REGISTRY[app];

    // Generische GLOBAL-App-Ziel-URL: `baseRoute` aus der `AppRegistry` ist
    // für GLOBAL-Apps bereits die vollständige Ziel-URL (kein Context).
    // Neue GLOBAL-Apps benötigen dadurch KEINE Änderung an dieser Methode.
    if (registryEntry?.scope === 'GLOBAL') {
      return registryEntry.baseRoute;
    }

    // STORE-scoped Apps haben (noch) unterschiedliche, historisch gewachsene
    // URL-Formen (app-zentrisch vs. `/stores/:id/...` vs. Sonderfälle) und
    // werden deshalb bewusst weiterhin explizit behandelt.
    switch (app) {
      case AppKey.DHL:
        // App-zentrische URL (Ziel-Bild); die klassische
        // `/stores/:id/dhl`-Route bleibt als Legacy-Alias weiter erreichbar.
        return `/apps/dhl/${storeId}`;
      case AppKey.LOYALTY:
        // App-zentrische URL (Ziel-Bild, analog DHL); die klassische
        // `/stores/:id/loyalty`-Route bleibt als Legacy-Alias weiter
        // erreichbar (siehe app.routes.ts).
        return `/apps/loyalty/${storeId}`;
      case AppKey.SHOP:
        return storeId != null ? `/stores/${storeId}` : '/dashboard';
      default:
        // Sicherer Fallback für zukünftige GLOBAL-Apps ohne eigenen Case
        // (sollte durch die obige Abfrage bereits abgedeckt sein).
        return registryEntry?.baseRoute ?? '/apps';
    }
  }

  /** Alle Apps, für die der aktuelle User mind. einen aktiven Context hat. */
  getAvailableApps(): AppKey[] {
    return this.appContextService.getAvailableApps();
  }

  /**
   * Ziel-URL für genau EINE App (Login-Redirect bei genau 1 verfügbarer App,
   * App-Launcher-Karten-Klick, App-Switcher-Auswahl). Zentrale, einzige
   * Stelle für die Regel "1 Context → direkt öffnen, >1 Contexts → generische
   * Context-Auswahl (falls die App das unterstützt), sonst deterministischer
   * Fallback auf den ersten Context (aufsteigende contextId)".
   */
  resolveAppEntryUrl(app: AppKey): string {
    const contexts = this.appContextService.getContexts(app);
    if (contexts.length === 0) {
      return '/apps/no-access';
    }
    if (contexts.length === 1) {
      const only = contexts[0];
      return this.buildAppHomeUrl(app, only.contextId != null ? Number(only.contextId) : null);
    }

    const registryEntry = APP_REGISTRY[app];
    if (registryEntry?.contextSelectorSupported) {
      // Bare App-Route → generische Context-Auswahl (AppContextSelectorComponent).
      return registryEntry.baseRoute;
    }

    // Apps ohne dedizierte Context-Auswahl (noch nicht auf /apps/{segment}
    // umgestellt): deterministischer Fallback wie in der bisherigen
    // Phase-2-Logik (kleinste contextId zuerst) – kein Verhaltensbruch.
    const sorted = [...contexts].sort(
      (a, b) => Number(a.contextId ?? 0) - Number(b.contextId ?? 0)
    );
    const first = sorted[0];
    return this.buildAppHomeUrl(app, first.contextId != null ? Number(first.contextId) : null);
  }

  /**
   * Ziel-URL für MANAGED-User direkt nach dem Login bzw. für Redirects von
   * gesperrten Routen:
   * - 0 verfügbare Apps  → sichere No-Access-Seite (`/apps/no-access`).
   * - genau 1 verfügbare App → direkt in diese App (bzw. deren
   *   Context-Auswahl, falls sie mehrere Contexts hat, siehe
   *   `resolveAppEntryUrl`).
   * - >1 verfügbare Apps → generischer App-Launcher (`/apps`). Mehrere
   *   Entitlements DERSELBEN App zählen dabei als eine App.
   */
  getPrimaryAppHomeUrl(): string {
    const apps = this.getAvailableApps();
    if (apps.length === 0) {
      return '/apps/no-access';
    }
    if (apps.length > 1) {
      return '/apps';
    }
    return this.resolveAppEntryUrl(apps[0]);
  }
}
