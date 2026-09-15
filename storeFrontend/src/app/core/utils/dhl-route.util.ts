import { resolveAppBasePath } from './app-route.util';

/**
 * DHL-spezifischer, dünner Wrapper um den generischen `resolveAppBasePath()`
 * (siehe `core/utils/app-route.util.ts`). Bleibt aus Kompatibilitätsgründen
 * erhalten, da die bestehenden DHL-Feature-Komponenten ihn für
 * `router.navigate(...)`-Aufrufe verwenden. Neue Apps (MARITIME, LOYALTY, ...)
 * sollten direkt `resolveAppBasePath()` mit eigener `AppRouteConfig`
 * verwenden statt einen weiteren App-spezifischen Wrapper zu schreiben.
 *
 * Löst auf:
 * - App-zentrische Route (Ziel-Bild): `/apps/dhl/:storeId`
 * - Legacy-Alias (weiterhin unterstützt): `/stores/:storeId/dhl`
 *
 * `:storeId` bleibt in beiden Fällen ausschließlich der bestehende
 * technische DHL-Mandanten-/Datenkontext (keine Bedeutungsänderung).
 */
export function resolveDhlBasePath(url: string): string {
  return resolveAppBasePath(url, { appSegment: 'dhl', legacySegment: 'dhl' });
}
