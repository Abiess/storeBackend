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

          // Wenn nicht eingeloggt, zur Login-Seite
          if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url, error: 'auth_required' }
            });
          } else {
            // Eingeloggt aber keine Berechtigung - zum Dashboard
            alert('Sie haben keine Berechtigung für diese Aktion.');
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
