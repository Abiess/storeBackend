import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Liste der öffentlichen Endpunkte, die KEINEN Token brauchen
    const publicEndpoints = [
      '/api/auth/',
      '/api/public/',
      '/api/stores/by-domain/',
      '/api/stores/by-slug/',
      '/api/cart/',
      '/api/checkout/',
      '/api/orders/create',
      '/api/subscriptions/plans',
      '/api/me/stores/check-slug/'
    ];

    // Prüfe ob es sich um einen öffentlichen Storefront-Request handelt
    const isPublicStorefrontRequest =
      req.url.includes('/api/stores/') &&
      (req.url.includes('/products') || req.url.includes('/public/')) &&
      req.method === 'GET';

    // Prüfe ob URL zu öffentlichen Endpunkten gehört
    const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

    // Wenn öffentlicher Endpunkt oder öffentlicher Storefront-Request, KEIN Token senden
    if (isPublicEndpoint || isPublicStorefrontRequest) {
      console.log('🔓 Public request, no token:', req.url);
      return next.handle(req);
    }

    // Für alle anderen Requests: Token hinzufügen wenn vorhanden
    const token = this.authService.getToken();
    if (token) {
      console.log('🔒 Authenticated request with token:', req.url);
      const clonedReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(clonedReq);
    }

    console.log('⚠️ No token available for:', req.url);
    return next.handle(req);
  }
}
