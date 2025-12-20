import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { MockCartService } from '../mocks/mock-cart.service';

export interface CartItem {
  id: number;
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  price: number;
  priceSnapshot: number;
  imageUrl?: string;
}

export interface Cart {
  id: number;
  sessionId: string;
  storeId: number;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  expiresAt: string;
}

export interface AddToCartRequest {
  sessionId: string;
  storeId: number;
  productId: number;  // Geändert von variantId zu productId
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private mockService = new MockCartService();
  // Verwende vereinfachten Warenkorb-Endpoint ohne Varianten
  private cartApiUrl = `${environment.publicApiUrl}/simple-cart`;

  constructor(private http: HttpClient) {}

  getCart(sessionId: string): Observable<Cart> {
    if (environment.useMockData) {
      return this.mockService.getCart(sessionId);
    }
    return this.http.get<Cart>(`${this.cartApiUrl}?sessionId=${sessionId}`);
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

  clearCart(sessionId: string): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.clearCart(sessionId);
    }
    return this.http.delete<void>(`${this.cartApiUrl}/clear?sessionId=${sessionId}`);
  }

  getCartItemCount(storeId: number, sessionId: string): Observable<number> {
    if (environment.useMockData) {
      return this.mockService.getCartItemCount(storeId, sessionId);
    }
    return this.http.get<number>(`${this.cartApiUrl}/count?storeId=${storeId}&sessionId=${sessionId}`);
  }

  getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = 'session-' + Math.random().toString(36).substring(7) + '-' + Date.now();
      localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Erstellt eine store-spezifische Session-ID
   * Jeder Store hat seinen eigenen Warenkorb
   */
  getOrCreateStoreSessionId(storeId: number): string {
    const sessionKey = `cart_session_store_${storeId}`;
    let sessionId = localStorage.getItem(sessionKey);

    if (!sessionId) {
      sessionId = `store${storeId}-session-` + Math.random().toString(36).substring(7) + '-' + Date.now();
      localStorage.setItem(sessionKey, sessionId);
      console.log(`🛒 Neue Session für Store ${storeId}: ${sessionId}`);
    } else {
      console.log(`🛒 Bestehende Session für Store ${storeId}: ${sessionId}`);
    }

    return sessionId;
  }

  /**
   * Gibt alle Warenkorb-Sessions zurück (für alle Stores)
   */
  getAllStoreSessions(): Map<number, string> {
    const sessions = new Map<number, string>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cart_session_store_')) {
        const storeId = parseInt(key.replace('cart_session_store_', ''));
        const sessionId = localStorage.getItem(key);
        if (sessionId) {
          sessions.set(storeId, sessionId);
        }
      }
    }

    return sessions;
  }

  /**
   * Löscht die Session für einen bestimmten Store
   */
  clearStoreSession(storeId: number): void {
    const sessionKey = `cart_session_store_${storeId}`;
    localStorage.removeItem(sessionKey);
    console.log(`🗑️ Session für Store ${storeId} gelöscht`);
  }
}
