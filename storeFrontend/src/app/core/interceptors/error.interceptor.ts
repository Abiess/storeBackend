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
        // Detailliertes Logging für Debugging
        console.error('HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error,
          headers: error.headers,
          message: error.message
        });

        // Prüfe ob es sich um einen öffentlichen Storefront-Request handelt
        const isPublicStorefrontRequest = this.isPublicStorefrontEndpoint(req.url);

        // Prüfe ob User eingeloggt ist
        const currentUser = this.authService.getCurrentUser();
        const token = this.authService.getToken();
        console.log('Current User:', currentUser);
        console.log('Token exists:', !!token);
        console.log('Is public storefront request:', isPublicStorefrontRequest);

        if (error.status === 401) {
          // Unauthorized - nur umleiten wenn es KEIN öffentlicher Storefront-Request ist
          if (!isPublicStorefrontRequest && !this.isLoggingOut) {
            // FIXED: Token client-seitig prüfen bevor wir logout auslösen
            // Wenn Token noch gültig ist → Backend-Problem, kein client-seitiger Logout nötig
            const tokenExpired = this.authService.isTokenExpired();
            const hadToken = !!token;

            if (hadToken && !tokenExpired) {
              // Token ist noch gültig → 401 kommt vom Backend (z.B. Rechte-Problem, nicht Expiry)
              // Nur warnen, NICHT ausloggen – der Service handled es selbst
              console.warn('⚠️ 401 erhalten, aber Token ist noch gültig – kein automatischer Logout:', req.url);
            } else {
              // Token fehlt oder abgelaufen → echte Session-Expiry → Logout
              console.error('⏰ Token abgelaufen oder fehlt – leite zum Login weiter');
              this.isLoggingOut = true;
              this.authService.logout();
              this.router.navigate(['/login'], {
                queryParams: { returnUrl: this.router.url, error: 'session_expired' }
              }).then(() => {
                // Flag nach Navigation zurücksetzen
                setTimeout(() => { this.isLoggingOut = false; }, 2000);
              });
            }
          } else if (isPublicStorefrontRequest) {
            console.warn('401 auf öffentlichem Endpoint - ignoriere für Storefront:', req.url);
          }
        } else if (error.status === 403) {
          // Forbidden - Keine Berechtigung
          console.error('Zugriff verweigert - fehlende Berechtigungen');
          console.error('User beim 403-Fehler:', currentUser);
          console.error('Token beim 403-Fehler:', token ? 'vorhanden' : 'fehlt');

          // Wenn öffentlicher Storefront-Request: NICHT umleiten!
          if (isPublicStorefrontRequest) {
            console.warn('403 auf öffentlichem Storefront-Endpoint - keine Umleitung zum Login');
            console.warn('Komponente sollte Fallback-Werte verwenden (z.B. count=0, leere Arrays)');
            // Fehler wird an die Komponente weitergegeben, die ihn graceful handled
            return throwError(() => error);
          }

          // Wenn nicht eingeloggt UND kein öffentlicher Request, zur Login-Seite
          if (!this.authService.isAuthenticated()) {
            console.error('User nicht authentifiziert - Weiterleitung zum Login');
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url, error: 'auth_required' }
            });
          } else {
            // Eingeloggt aber keine Berechtigung
            console.error('User authentifiziert aber 403-Fehler erhalten');
            console.error('Möglicherweise wurde das Backend noch nicht aktualisiert oder Sie müssen sich erneut anmelden');

            // KEIN Alert mehr - Fehler wird in der Komponente behandelt
            // Versuche User vom Backend neu zu laden (leise im Hintergrund)
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
          // Not found
          console.error('Ressource nicht gefunden');
        } else if (error.status >= 500) {
          // Server error
          console.error('Serverfehler:', error.message);
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Prüft ob es sich um einen öffentlichen Storefront-Endpoint handelt.
   * Diese Endpoints sollten NICHT zum Login umleiten bei 401/403.
   *
   * WICHTIG: '/api/stores/' darf hier NICHT pauschal stehen –
   * Store-Admin-Endpoints (/seo, /orders, /settings …) benötigen Auth!
   */
  private isPublicStorefrontEndpoint(url: string): boolean {
    const publicPatterns = [
      '/api/public/',
      '/api/cart/',
      '/api/checkout/',
      '/api/phone-verification/',
      'by-domain',
      'resolve?host='
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
    ];

    if (publicPatterns.some(p => url.includes(p))) return true;
    if (publicStorePatterns.some(p => url.includes(p))) return true;

    // /api/stores/{id}/products, /api/stores/{id}/categories, etc. sind öffentlich
    if (url.includes('/api/stores/') && publicStoreSubRoutes.some(p => url.includes(p))) {
      return true;
    }

    return false;
  }
}
