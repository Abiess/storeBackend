import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '@env/environment';
import { MockCartService } from '../mocks/mock-cart.service';
import { map, catchError } from 'rxjs/operators';

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
  private readonly SESSION_ID_KEY = 'cart_session_id';

  constructor(private http: HttpClient) {}

  /**
   * Generiert oder lädt eine Session-ID für den Warenkorb
   */
  getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(this.SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem(this.SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Generiert eine neue eindeutige Session-ID
   */
  private generateSessionId(): string {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getCart(storeId: number): Observable<Cart> {
    if (environment.useMockData) {
      return this.mockService.getCart(storeId);
    }
    return this.http.get<Cart>(`${this.cartApiUrl}?storeId=${storeId}`);
  }

  addItem(request: AddToCartRequest): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.addItem(request);
    }
    return this.http.post<any>(`${this.cartApiUrl}/items`, request);
  }

  updateItem(itemId: number, quantity: number): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.updateItem(itemId, quantity);
    }
    return this.http.put<any>(`${this.cartApiUrl}/items/${itemId}`, { quantity });
  }

  removeItem(itemId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.removeItem(itemId);
    }
    return this.http.delete<void>(`${this.cartApiUrl}/items/${itemId}`);
  }

  clearCart(storeId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.clearCart(storeId);
    }
    return this.http.delete<void>(`${this.cartApiUrl}/clear?storeId=${storeId}`);
  }

  getCartItemCount(storeId: number): Observable<number> {
    if (environment.useMockData) {
      return this.mockService.getCartItemCount(storeId, '');
    }
    return this.http.get<{count: number}>(`${this.cartApiUrl}/count?storeId=${storeId}`)
      .pipe(
        map(response => response.count),
        catchError(error => {
          console.error('Fehler beim Laden des Warenkorb-Counts:', error);
          return of(0);
        })
      );
  }
}
