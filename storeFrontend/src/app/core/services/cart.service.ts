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
   * Holt den JWT Token aus localStorage (optional für Cart-Operationen)
   */
  private getAuthToken(): string | null {
    const token = localStorage.getItem('auth_token');
    return token; // Kein Redirect mehr - Token ist optional für Cart
  }

  /**
   * Erstellt HTTP Headers mit Authorization Token (falls vorhanden)
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    return new HttpHeaders(); // Leere Headers wenn kein Token
  }

  /**
   * Prüft ob User eingeloggt ist
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  getCart(storeId: number): Observable<Cart> {
    if (environment.useMockData) {
      return this.mockService.getCart(storeId);
    }

    // FIXED: Cart-Laden funktioniert jetzt auch ohne Login (Guest Cart)
    console.log('🛒 Lade Warenkorb für Store', storeId);
    return this.http.get<Cart>(`${this.cartApiUrl}?storeId=${storeId}`, {
      headers: this.getAuthHeaders() // Token optional
    }).pipe(
      catchError(error => {
        console.warn('⚠️ Fehler beim Laden des Warenkorbs:', error);
        // Returniere leeren Cart statt Fehler
        return of({
          cartId: 0,
          storeId: storeId,
          items: [],
          itemCount: 0,
          subtotal: 0
        } as Cart);
      })
    );
  }

  addItem(request: AddToCartRequest): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.addItem(request);
    }

    // FIXED: Produkt hinzufügen funktioniert jetzt auch ohne Login (Guest Cart)
    console.log('➕ Füge Produkt zum Warenkorb hinzu (Guest Cart unterstützt)');
    return this.http.post<any>(`${this.cartApiUrl}/items`, request, {
      headers: this.getAuthHeaders() // Token optional
    }).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Hinzufügen zum Warenkorb:', error);
        return throwError(() => error);
      })
    );
  }

  updateItem(itemId: number, quantity: number): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.updateItem(itemId, quantity);
    }

    // FIXED: Update funktioniert auch ohne Login
    return this.http.put<any>(`${this.cartApiUrl}/items/${itemId}`, { quantity }, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Aktualisieren des Warenkorbs:', error);
        return throwError(() => error);
      })
    );
  }

  removeItem(itemId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.removeItem(itemId);
    }

    // FIXED: Remove funktioniert auch ohne Login
    return this.http.delete<void>(`${this.cartApiUrl}/items/${itemId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Entfernen aus dem Warenkorb:', error);
        return throwError(() => error);
      })
    );
  }

  clearCart(storeId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.clearCart(storeId);
    }

    // FIXED: Clear funktioniert auch ohne Login
    return this.http.delete<void>(`${this.cartApiUrl}/clear?storeId=${storeId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('❌ Fehler beim Leeren des Warenkorbs:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gibt die Anzahl der Items im Warenkorb zurück
   * FIXED: Funktioniert jetzt auch ohne Login
   */
  getCartItemCount(storeId: number): Observable<number> {
    if (environment.useMockData) {
      return this.mockService.getCart(storeId).pipe(
        map(cart => cart.itemCount)
      );
    }

    // FIXED: Count funktioniert auch ohne Token
    return this.http.get<any>(`${this.cartApiUrl}/count?storeId=${storeId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.count || 0),
      catchError(error => {
        console.warn('⚠️ Fehler beim Laden der Cart-Count:', error);
        return of(0);
      })
    );
  }
}
