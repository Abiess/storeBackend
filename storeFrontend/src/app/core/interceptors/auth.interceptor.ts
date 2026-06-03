import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Liste der Endpoints, die nie einen Token brauchen (werden ohne Auth gesendet)
    const publicEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/validate',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify',
      '/api/auth/resend-verification',
      '/api/stores/by-domain/',
      '/api/stores/by-slug/',
      '/api/subscriptions/plans',
      '/api/me/stores/check-slug/',
      // HINWEIS: /api/themes/** wurde hier entfernt!
      // GET ist öffentlich (→ eigene Prüfung unten), POST/PUT/DELETE braucht Auth.
    ];

    // Öffentliche Storefront-Endpoints bei GET-Methode (kein Auth nötig)
    const publicStoreSubRoutes = [
      '/products',
      '/categories',
      '/slider/active',
      '/public/',
      '/seo',
    ];

    // Endpoints mit optionalem Auth (Token senden falls vorhanden, sonst ohne)
    const optionalAuthEndpoints = [
      '/api/public/',
      '/api/cart/',
      '/api/customer/',
    ];

    // Checkout/Bezahlung erfordert IMMER Auth-Token
    const requiresAuthEndpoints = [
      '/api/public/orders/checkout',
      '/api/checkout/',
    ];

    const url = req.url;
    const method = req.method;
    const token = this.authService.getToken();

    // 1. Checkout: immer mit Token
    if (requiresAuthEndpoints.some(e => url.includes(e))) {
      if (token) {
        return next.handle(req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) }));
      }
      return next.handle(req);
    }

    // 2. Explizit öffentliche Endpunkte → niemals Token senden
    if (publicEndpoints.some(e => url.includes(e))) {
      return next.handle(req);
    }

    // 3a. Theme-Endpunkte: nur GET ist öffentlich (für Storefront-Vorschau).
    //     POST/PUT/DELETE (z.B. /onboard, Template speichern) brauchen zwingend Auth.
    if (method === 'GET' && url.includes('/api/themes/')) {
      return next.handle(req);
    }

    // 3b. Öffentliche Store-Unterseiten (GET) → kein Token
    if (method === 'GET' && url.includes('/api/stores/') &&
        publicStoreSubRoutes.some(p => url.includes(p))) {
      return next.handle(req);
    }

    // 4. Optionale Auth (z.B. Warenkorb, Public-API): Token falls vorhanden
    if (optionalAuthEndpoints.some(e => url.includes(e))) {
      if (token && !this.authService.isTokenExpired(token)) {
        return next.handle(req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) }));
      }
      return next.handle(req);
    }

    // 5. Für alle anderen Requests: Token hinzufügen wenn vorhanden und gültig
    if (token && !this.authService.isTokenExpired(token)) {
      return next.handle(req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) }));
    }

    console.debug('🔕 No valid token for request:', url);
    return next.handle(req);
  }
}
