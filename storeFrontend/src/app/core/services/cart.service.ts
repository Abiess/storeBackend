import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { MockCartService } from '../mocks/mock-cart.service';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface CartItem {
  id: number;
  productId: number;
  productTitle: string;
  productDescription?: string;
  variantId: number;
  variantSku: string;
  quantity: number;
  priceSnapshot: number;
  imageUrl?: string;
}

export interface Cart {
  cartId: number;
  storeId: number;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface AddToCartRequest {
  storeId: number;
  productId: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private mockService = new MockCartService();
  private cartApiUrl = `${environment.publicApiUrl}/simple-cart`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Holt den JWT Token aus localStorage
   * Leitet zur Login-Seite weiter wenn nicht vorhanden
   */
  private getAuthToken(): string | null {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('⚠️ Kein Auth-Token gefunden - Login erforderlich');
      return null;
    }
    return token;
  }

  /**
   * Erstellt HTTP Headers mit Authorization Token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Prüft ob User eingeloggt ist
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Zeigt Login-Dialog und leitet zur Login-Seite
   */
  private requireAuth(): void {
    console.log('🔐 Authentifizierung erforderlich - Weiterleitung zum Login');
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  getCart(storeId: number): Observable<Cart> {
    if (environment.useMockData) {
      return this.mockService.getCart(storeId);
    }

    if (!this.isAuthenticated()) {
      this.requireAuth();
      return throwError(() => new Error('Authentication required'));
    }

    console.log('🛒 Lade Warenkorb für Store', storeId);
    return this.http.get<Cart>(`${this.cartApiUrl}?storeId=${storeId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        if (error.status === 401) {
          console.error('❌ Token ungültig oder abgelaufen');
          this.requireAuth();
        }
        return throwError(() => error);
      })
    );
  }

  addItem(request: AddToCartRequest): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.addItem(request);
    }

    if (!this.isAuthenticated()) {
      this.requireAuth();
      return throwError(() => new Error('Authentication required'));
    }

    console.log('➕ Füge Produkt zum Warenkorb hinzu');
    return this.http.post<any>(`${this.cartApiUrl}/items`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        if (error.status === 401) {
          console.error('❌ Token ungültig oder abgelaufen');
          this.requireAuth();
        }
        return throwError(() => error);
      })
    );
  }

  updateItem(itemId: number, quantity: number): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.updateItem(itemId, quantity);
    }

    if (!this.isAuthenticated()) {
      this.requireAuth();
      return throwError(() => new Error('Authentication required'));
    }

    return this.http.put<any>(`${this.cartApiUrl}/items/${itemId}`, { quantity }, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        if (error.status === 401) {
          this.requireAuth();
        }
        return throwError(() => error);
      })
    );
  }

  removeItem(itemId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.removeItem(itemId);
    }

    if (!this.isAuthenticated()) {
      this.requireAuth();
      return throwError(() => new Error('Authentication required'));
    }

    return this.http.delete<void>(`${this.cartApiUrl}/items/${itemId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        if (error.status === 401) {
          this.requireAuth();
        }
        return throwError(() => error);
      })
    );
  }

  clearCart(storeId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.clearCart(storeId);
    }

    if (!this.isAuthenticated()) {
      this.requireAuth();
      return throwError(() => new Error('Authentication required'));
    }

    return this.http.delete<void>(`${this.cartApiUrl}/clear?storeId=${storeId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        if (error.status === 401) {
          this.requireAuth();
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Gibt die Anzahl der Items im Warenkorb zurück
   */
  getCartItemCount(storeId: number): Observable<number> {
    if (environment.useMockData) {
      return this.mockService.getCart(storeId).pipe(
        map(cart => cart.itemCount)
      );
    }

    if (!this.isAuthenticated()) {
      return of(0); // Nicht-eingeloggte User haben 0 Items
    }

    return this.http.get<any>(`${this.cartApiUrl}/count?storeId=${storeId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.count || 0),
      catchError(error => {
        console.warn('Fehler beim Laden der Cart-Count:', error);
        return of(0);
      })
    );
  }
}
