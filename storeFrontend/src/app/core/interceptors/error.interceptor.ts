import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  // Flag verhindert doppelte Logout-Navigation (Race Condition bei mehreren parallelen 401s)
  private isLoggingOut = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Detailliertes Logging für Debugging (KEINE sensiblen Daten)
        console.error('HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });

        // Prüfe ob es sich um einen öffentlichen Storefront-Request handelt
        const isPublicStorefrontRequest = this.isPublicStorefrontEndpoint(req.url);

        // NEU: Prüfe ob wir uns auf einer Store-Subdomain befinden.
        // Auf Subdomains (andalous.markt.ma) ist die App öffentlich – nie zu Login weiterleiten!
        const isStorefrontSubdomain = this.isOnStorefrontSubdomain();

        // NEU: Prüfe ob wir uns auf einer öffentlichen Seite befinden (z.B. /create-store, /quick-start)
        const isPublicPage = this.isPublicPage();

        // Prüfe ob User eingeloggt ist
        const currentUser = this.authService.getCurrentUser();
        const token = this.authService.getToken();

        if (error.status === 401) {
          // Unauthorized - nur umleiten wenn es KEIN öffentlicher Storefront-Request ist
          // UND wir uns NICHT auf einer Store-Subdomain befinden UND NICHT auf einer öffentlichen Seite
          if (!isPublicStorefrontRequest && !isStorefrontSubdomain && !isPublicPage && !this.isLoggingOut) {
            // FIXED: Token client-seitig prüfen bevor wir logout auslösen
            const tokenExpired = this.authService.isTokenExpired();
            const hadToken = !!token;

            if (hadToken && !tokenExpired) {
              // Token ist noch gültig → 401 kommt vom Backend (z.B. Rechte-Problem, nicht Expiry)
              console.warn('⚠️ 401 erhalten, aber Token ist noch gültig – kein automatischer Logout:', req.url);
            } else {
              // Token fehlt oder abgelaufen → echte Session-Expiry → Logout
              console.error('⏰ Token abgelaufen oder fehlt – leite zum Login weiter');
              this.isLoggingOut = true;
              this.authService.logout();
              this.router.navigate(['/login'], {
                queryParams: { returnUrl: this.router.url, error: 'session_expired' }
              }).then(() => {
                setTimeout(() => { this.isLoggingOut = false; }, 2000);
              });
            }
          } else if (isPublicStorefrontRequest || isStorefrontSubdomain || isPublicPage) {
            console.warn('401 auf öffentlichem/Storefront-Endpoint oder öffentlicher Seite - ignoriere:', req.url);
          }
        } else if (error.status === 403) {
          // Forbidden - Keine Berechtigung
          console.error('Zugriff verweigert - fehlende Berechtigungen');
          console.error('User beim 403-Fehler:', currentUser);
          console.error('Token beim 403-Fehler:', token ? 'vorhanden' : 'fehlt');

          // Wenn öffentlicher Storefront-Request oder Subdomain oder öffentliche Seite: NICHT umleiten!
          if (isPublicStorefrontRequest || isStorefrontSubdomain || isPublicPage) {
            console.warn('403 auf öffentlichem/Storefront-Endpoint oder öffentlicher Seite - keine Umleitung zum Login');
            return throwError(() => error);
          }

          // Wenn nicht eingeloggt UND kein öffentlicher Request, zur Login-Seite
          if (!this.authService.isAuthenticated()) {
            console.error('User nicht authentifiziert - Weiterleitung zum Login');
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url, error: 'auth_required' }
            });
          } else {
            console.error('User authentifiziert aber 403-Fehler erhalten');
            this.authService.reloadCurrentUser().subscribe({
              next: (user) => {
                if (user) {
                  console.log('User erfolgreich neu geladen:', user);
                } else {
                  console.error('User konnte nicht neu geladen werden');
                }
              },
              error: (err) => {
                console.error('Fehler beim Neuladen des Users:', err);
              }
            });
          }
        } else if (error.status === 404) {
          console.error('Ressource nicht gefunden');
        } else if (error.status >= 500) {
          console.error('Serverfehler:', error.message);
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Erkennt ob die App auf einer Store-Subdomain läuft (z.B. andalous.markt.ma).
   * Auf Subdomains ist die gesamte App öffentlich → kein Login-Redirect bei 401/403.
   */
  private isOnStorefrontSubdomain(): boolean {
    const hostname = window.location.hostname;
    const reservedSubdomains = ['api', 'www', 'grafana', 'admin'];
    if (!hostname.endsWith('.markt.ma')) return false;
    const subdomain = hostname.replace('.markt.ma', '');
    return !reservedSubdomains.includes(subdomain);
  }

  /**
   * Prüft ob wir uns auf einer öffentlichen Seite befinden (z.B. /create-store, /quick-start).
   * Diese Seiten sollten NICHT zum Login umleiten bei 401/403.
   */
  private isPublicPage(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    const publicPages = [
      '/create-store',
      '/quick-start',
      '/login',
      '/register',
      '/verify',
      '/forgot-password',
      '/reset-password',
      '/impressum',
      '/datenschutz',
      '/agb',
      '/kontakt',
      '/storefront-landing',
      '/cart',
      '/checkout',
      '/order-confirmation'
    ];
    return publicPages.some(p => path.startsWith(p) || path === p);
  }

  /**
   * Prüft ob es sich um einen öffentlichen Storefront-Endpoint handelt.
   * Diese Endpoints sollten NICHT zum Login umleiten bei 401/403.
   *
   * WICHTIG: '/api/stores/' darf hier NICHT pauschal stehen –
   * Store-Admin-Endpoints (/orders, /settings …) benötigen Auth!
   */
  private isPublicStorefrontEndpoint(url: string): boolean {
    const publicPatterns = [
      '/api/public/',
      '/api/cart/',
      '/api/checkout/',
      '/api/phone-verification/',
      'by-domain',
      'resolve?host=',
      // Theme-Endpunkte sind für die Storefront öffentlich (Subdomain-Besucher ohne Auth)
      '/api/themes/store/',
      '/api/themes/templates',
    ];

    // Öffentliche Store-Unterseiten (Storefront)
    const publicStorePatterns = [
      '/api/stores/by-domain/',
      '/api/stores/by-slug/',
      '/api/stores/public/',
    ];

    // Spezifische öffentliche Sub-Routen eines Stores (Storefront-Ansicht)
    const publicStoreSubRoutes = [
      '/products',
      '/categories',
      '/slider/active',
      '/public/',
      // SEO-Einstellungen werden auf der Storefront für Meta-Tags benötigt (kein Auth nötig)
      '/seo',
    ];

    if (publicPatterns.some(p => url.includes(p))) return true;
    if (publicStorePatterns.some(p => url.includes(p))) return true;

    // /api/stores/{id}/products, /api/stores/{id}/categories,
    // /api/stores/{id}/seo etc. sind für die Storefront öffentlich
    return url.includes('/api/stores/') && publicStoreSubRoutes.some(p => url.includes(p));
  }
}
