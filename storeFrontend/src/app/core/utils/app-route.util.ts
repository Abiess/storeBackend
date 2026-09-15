/**
 * Generischer Auflöser für die Basis-Route einer "App" innerhalb der
 * Multi-Tenant-Plattform (DHL, LOYALTY, MARITIME, ISSUE_ANALYSIS, ...).
 *
 * Unterstützt zwei Routen-Familien, wie sie bereits für DHL etabliert sind:
 * - App-zentrisch (Ziel-Bild):  `/apps/{appSegment}/:contextId`
 * - Legacy-Alias (optional):    `/stores/:contextId/{legacySegment}`
 *
 * `contextId` ist bewusst generisch benannt (nicht `storeId`) – für DHL ist
 * das aktuell weiterhin die Store-ID (rein technischer Mandanten-/
 * Datenkontext), andere Apps können hier künftig einen anderen fachlichen
 * Kontext (z.B. eine Schiffs- oder Vorgangs-ID) durchreichen, ohne dass
 * generischer Code angepasst werden muss.
 */
export interface AppRouteConfig {
  /** Segment der app-zentrischen Route, z.B. 'dhl' → /apps/dhl/:contextId */
  appSegment: string;
  /** Optionales Legacy-Alias-Segment unter /stores/:contextId/{legacySegment} */
  legacySegment?: string;
}

/**
 * Ermittelt den aktuell aktiven Basis-Pfad einer App anhand der URL, damit
 * Navigation innerhalb dieser App konsistent in derselben Routen-Familie
 * bleibt (kein ungewollter Wechsel zwischen `/apps/...` und `/stores/...`,
 * der z.B. bei DHL sonst versehentlich die Shop-Admin-Sidebar auslösen
 * würde, siehe `AppComponent.evaluateShell`).
 *
 * Gibt `''` zurück, falls die URL keiner der beiden Routen-Familien der
 * übergebenen Konfiguration zugeordnet werden kann.
 */
export function resolveAppBasePath(url: string, config: AppRouteConfig): string {
  const path = (url || '').split('?')[0].split('#')[0];

  const appsMatch = path.match(new RegExp(`^/apps/${config.appSegment}/([^/]+)`));
  if (appsMatch) {
    return `/apps/${config.appSegment}/${appsMatch[1]}`;
  }

  if (config.legacySegment) {
    const legacyMatch = path.match(new RegExp(`^/stores/([^/]+)/${config.legacySegment}`));
    if (legacyMatch) {
      return `/stores/${legacyMatch[1]}/${config.legacySegment}`;
    }
  }

  return '';
}
