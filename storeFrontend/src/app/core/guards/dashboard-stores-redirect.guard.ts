import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Redirect-Guard, der `/dashboard/stores/...`-URLs auf `/stores/...`
 * umleitet UND den kompletten Suffix (z.B. `/orders/verification`)
 * sowie Query-Params + Fragment 1:1 übernimmt.
 *
 * Hintergrund: Wir hatten 24 doppelte Routen registriert – einmal mit
 * `/dashboard/`-Prefix, einmal ohne. Jede zeigte auf dieselbe Komponente
 * und führte zu inkonsistentem UI-Verhalten (Sidebar nur bei einer
 * Variante sichtbar). Mit diesem Guard gibt es nur noch EINE Quelle der
 * Wahrheit; alte Bookmarks landen automatisch auf der modernen URL inkl.
 * Sidebar.
 */
export const dashboardStoresRedirectGuard: CanActivateFn = (_route, state): UrlTree => {
  const router = inject(Router);

  // state.url enthält die komplette URL incl. QueryParams + Fragment
  // Beispiel: '/dashboard/stores/123/orders/verification?status=PENDING#tab1'
  const newUrl = state.url.replace(/^\/dashboard\/stores(\/|$)/, '/stores$1');

  // parseUrl bewahrt Query-Params + Fragment automatisch
  return router.parseUrl(newUrl);
};

