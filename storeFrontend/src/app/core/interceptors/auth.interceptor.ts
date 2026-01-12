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
      '/api/stores/by-domain/',
      '/api/stores/by-slug/',
      '/api/subscriptions/plans',
      '/api/me/stores/check-slug/'
    ];

    // FIXED: Öffentliche Endpoints die auch MIT Token funktionieren sollen
    const optionalAuthEndpoints = [
      '/api/public/simple-cart',
      '/api/public/stores/',
      '/api/cart/',
    ];

    // FIXED: Checkout braucht IMMER einen Token!
    const requiresAuthEndpoints = [
      '/api/public/orders/checkout',
      '/api/checkout/',
      '/api/orders/create'
    ];

    // Prüfe ob es sich um einen öffentlichen Storefront-Request handelt
    const isPublicStorefrontRequest =
      req.url.includes('/api/stores/') &&
      (req.url.includes('/products') || req.url.includes('/public/')) &&
      req.method === 'GET';

    // FIXED: Checkout braucht immer Token, auch wenn in /api/public/
    const requiresAuth = requiresAuthEndpoints.some(endpoint => req.url.includes(endpoint));

    // Prüfe ob URL zu öffentlichen Endpunkten gehört (ohne Token)
    const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

    // Prüfe ob URL zu optionalen Auth-Endpunkten gehört (Token falls vorhanden)
    const isOptionalAuth = optionalAuthEndpoints.some(endpoint => req.url.includes(endpoint));

    // Hole Token
    const token = this.authService.getToken();

    // FIXED: Checkout erfordert IMMER Token
    if (requiresAuth) {
      if (token) {
        console.log('🔒 Authenticated request with token:', req.url);
        const clonedReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(clonedReq);
      } else {
        console.warn('⚠️ Auth required but no token for:', req.url);
        return next.handle(req);
      }
    }

    // Öffentliche Endpoints ohne Token
    if (isPublicEndpoint || isPublicStorefrontRequest) {
      console.log('🔓 Public request, no token:', req.url);
      return next.handle(req);
    }

    // Optionale Auth-Endpoints: Token senden falls vorhanden
    if (isOptionalAuth) {
      if (token) {
        console.log('🔒 Authenticated request with token:', req.url);
        const clonedReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(clonedReq);
      } else {
        console.log('🔓 Public request, no token:', req.url);
        return next.handle(req);
      }
    }

    // Für alle anderen Requests: Token hinzufügen wenn vorhanden
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
