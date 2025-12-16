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

        // Prüfe ob User eingeloggt ist
        const currentUser = this.authService.getCurrentUser();
        const token = this.authService.getToken();
        console.log('Current User:', currentUser);
        console.log('Token exists:', !!token);

        if (error.status === 401) {
          // Unauthorized - Token abgelaufen oder ungültig
          console.error('Authentifizierung fehlgeschlagen - bitte erneut anmelden');
          this.authService.logout();
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url, error: 'session_expired' }
          });
        } else if (error.status === 403) {
          // Forbidden - Keine Berechtigung
          console.error('Zugriff verweigert - fehlende Berechtigungen');
          console.error('User beim 403-Fehler:', currentUser);
          console.error('Token beim 403-Fehler:', token ? 'vorhanden' : 'fehlt');

          // Wenn nicht eingeloggt, zur Login-Seite
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
}
