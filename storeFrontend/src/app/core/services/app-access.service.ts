import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AppAccessMode, AppEntitlement, AppKey } from '../models';

/**
 * App-Entitlement Phase 2 (Frontend-Durchsetzung).
 *
 * Liest ausschließlich `appAccessMode` / `apps` aus dem bereits vorhandenen
 * `AuthService.getCurrentUser()` (Backend Phase 1). Es wird KEINE neue
 * Auth-/Permission-Infrastruktur aufgebaut – dieser Service ist nur die
 * Klassifizierung "welche App gehört zu dieser URL" + "darf der User dahin".
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

  /** Deterministische Priorität für die Wahl der "primären" App-Startseite. */
  private readonly appPriority: AppKey[] = [
    AppKey.DHL,
    AppKey.LOYALTY,
    AppKey.SHOP,
    AppKey.MARITIME,
    AppKey.ISSUE_ANALYSIS
  ];

  isManaged(): boolean {
    return this.authService.getCurrentUser()?.appAccessMode === AppAccessMode.MANAGED;
  }

  private getEntitlements(): AppEntitlement[] {
    return this.authService.getCurrentUser()?.apps ?? [];
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
    if (path.startsWith('/tools/maritime')) {
      return { kind: 'app', app: AppKey.MARITIME, storeId: null };
    }
    if (path.startsWith('/tools/issue-analysis')) {
      return { kind: 'app', app: AppKey.ISSUE_ANALYSIS, storeId: null };
    }

    return { kind: 'neutral' };
  }

  private hasEntitlement(app: AppKey, storeId: number | null): boolean {
    return this.getEntitlements().some(e =>
      e.enabled && e.app === app && (storeId == null ? e.storeId == null : e.storeId === storeId)
    );
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

  private buildAppHomeUrl(app: AppKey, storeId: number | null): string {
    switch (app) {
      case AppKey.DHL:
        // App-zentrische URL (Ziel-Bild); die klassische
        // `/stores/:id/dhl`-Route bleibt als Legacy-Alias weiter erreichbar.
        return `/apps/dhl/${storeId}`;
      case AppKey.LOYALTY:
        return `/stores/${storeId}/loyalty`;
      case AppKey.SHOP:
        return storeId != null ? `/stores/${storeId}` : '/dashboard';
      case AppKey.MARITIME:
        return '/tools/maritime';
      case AppKey.ISSUE_ANALYSIS:
        return '/tools/issue-analysis';
    }
  }

  /**
   * Ziel-URL für MANAGED-User direkt nach dem Login bzw. für Redirects von
   * gesperrten Routen. Bei mehreren erlaubten Apps/Stores wird deterministisch
   * (Priorität DHL > LOYALTY > SHOP > MARITIME > ISSUE_ANALYSIS, dann
   * aufsteigende storeId) der erste passende Eintrag gewählt – ein
   * vollwertiger App-Umschalter ist bewusst nicht Teil dieser minimalen
   * Phase-2-Umsetzung.
   */
  getPrimaryAppHomeUrl(): string {
    const enabled = this.getEntitlements().filter(e => e.enabled);
    if (enabled.length === 0) {
      // MANAGED ohne (mehr) aktive Entitlements: nichts App-Spezifisches
      // ist erlaubt – auf die neutrale Profilseite ausweichen.
      return '/settings';
    }

    const sorted = [...enabled].sort((a, b) => {
      const ai = this.appPriority.indexOf(a.app);
      const bi = this.appPriority.indexOf(b.app);
      if (ai !== bi) return ai - bi;
      return (a.storeId ?? 0) - (b.storeId ?? 0);
    });

    const first = sorted[0];
    return this.buildAppHomeUrl(first.app, first.storeId);
  }
}
