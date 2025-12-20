import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
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
          // Unauthorized - Token abgelaufen oder ungültig
          // Nur umleiten wenn es KEIN öffentlicher Storefront-Request ist
          if (!isPublicStorefrontRequest) {
            console.error('Authentifizierung fehlgeschlagen - bitte erneut anmelden');
            this.authService.logout();
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url, error: 'session_expired' }
            });
          } else {
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
          alert('Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Prüft ob es sich um einen öffentlichen Storefront-Endpoint handelt
   * Diese Endpoints sollten NICHT zum Login umleiten bei 401/403
   */
  private isPublicStorefrontEndpoint(url: string): boolean {
    const publicPatterns = [
      '/api/public/',
      '/api/stores/',
      '/products',
      '/categories',
      '/api/cart/',
      '/api/checkout/',
      'by-domain',
      'resolve?host='
    ];

    return publicPatterns.some(pattern => url.includes(pattern));
  }
}
