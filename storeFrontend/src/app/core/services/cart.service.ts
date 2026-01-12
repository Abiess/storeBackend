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
      console.log('🆕 Neue Session-ID erstellt:', sessionId);
    } else {
      console.log('♻️ Bestehende Session-ID geladen:', sessionId);
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
    const sessionId = this.getOrCreateSessionId();
    console.log('🛒 Lade Warenkorb für Store', storeId, 'mit Session', sessionId);
    return this.http.get<Cart>(`${this.cartApiUrl}?storeId=${storeId}`, {
      headers: {
        'X-Session-Id': sessionId
      }
    });
  }

  addItem(request: AddToCartRequest): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.addItem(request);
    }
    const sessionId = this.getOrCreateSessionId();
    console.log('➕ Füge Produkt zum Warenkorb hinzu mit Session', sessionId);
    return this.http.post<any>(`${this.cartApiUrl}/items`, request, {
      headers: {
        'X-Session-Id': sessionId
      }
    });
  }

  updateItem(itemId: number, quantity: number): Observable<any> {
    if (environment.useMockData) {
      return this.mockService.updateItem(itemId, quantity);
    }
    const sessionId = this.getOrCreateSessionId();
    return this.http.put<any>(`${this.cartApiUrl}/items/${itemId}`, { quantity }, {
      headers: {
        'X-Session-Id': sessionId
      }
    });
  }

  removeItem(itemId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.removeItem(itemId);
    }
    const sessionId = this.getOrCreateSessionId();
    return this.http.delete<void>(`${this.cartApiUrl}/items/${itemId}`, {
      headers: {
        'X-Session-Id': sessionId
      }
    });
  }

  clearCart(storeId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.clearCart(storeId);
    }
    const sessionId = this.getOrCreateSessionId();
    return this.http.delete<void>(`${this.cartApiUrl}/clear?storeId=${storeId}`, {
      headers: {
        'X-Session-Id': sessionId
      }
    });
  }

  getCartItemCount(storeId: number): Observable<number> {
    if (environment.useMockData) {
      return this.mockService.getCartItemCount(storeId, '');
    }
    const sessionId = this.getOrCreateSessionId();
    return this.http.get<{count: number}>(`${this.cartApiUrl}/count?storeId=${storeId}`, {
      headers: {
        'X-Session-Id': sessionId
      }
    })
      .pipe(
        map(response => response.count),
        catchError(error => {
          console.error('Fehler beim Laden des Warenkorb-Counts:', error);
          return of(0);
        })
      );
  }
}
