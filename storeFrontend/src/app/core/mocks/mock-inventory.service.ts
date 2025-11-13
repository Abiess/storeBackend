    quantityChange: -1,
    quantityBefore: 15,
    quantityAfter: 14,
    reason: 'Sale',
    notes: 'Verkauf über Webshop',
    userId: 1,
    userName: 'System',
    createdAt: '2024-03-02T14:30:00'
  },
  {
    id: 3,
    variantId: 3,
    productName: 'Wireless Mouse',
    variantName: 'Black',
    quantityChange: 25,
    quantityBefore: 25,
    quantityAfter: 50,
    reason: 'Restock',
    notes: 'Lagerbestand aufgefüllt',
    userId: 1,
    userName: 'Demo User',
    createdAt: '2024-03-05T09:15:00'
  }
];

let nextLogId = 4;

export class MockInventoryService {
  getStoreLogs(storeId: number): Observable<InventoryLog[]> {
    return of(mockInventoryLogs).pipe(delay(300));
  }

  getVariantLogs(storeId: number, productId: number, variantId: number): Observable<InventoryLog[]> {
    const logs = mockInventoryLogs.filter(log => log.variantId === variantId);
    return of(logs).pipe(delay(300));
  }

  adjustInventory(
    storeId: number,
    productId: number,
    variantId: number,
    request: AdjustInventoryRequest
  ): Observable<AdjustInventoryResponse> {
    // Finde das Produkt und die Variante
    const product = MOCK_PRODUCTS.find(p => p.id === productId);
    const variant = product?.variants?.find(v => v.id === variantId);

    if (!product || !variant) {
      throw new Error('Product or variant not found');
    }

    const quantityBefore = variant.stock;
    const quantityAfter = quantityBefore + request.quantityChange;

    // Update den Stock
    variant.stock = quantityAfter;

    // Erstelle neuen Log-Eintrag
    const newLog: InventoryLog = {
      id: nextLogId++,
      variantId,
      productName: product.name,
      variantName: variant.name,
      quantityChange: request.quantityChange,
      quantityBefore,
      quantityAfter,
      reason: request.reason,
      notes: request.notes,
      userId: MOCK_USER.id,
      userName: MOCK_USER.name,
      createdAt: new Date().toISOString()
    };

    mockInventoryLogs.unshift(newLog);

    const response: AdjustInventoryResponse = {
      success: true,
      log: newLog,
      message: 'Inventory adjusted successfully'
    };

    return of(response).pipe(delay(500));
  }
}
import { Observable, of, delay } from 'rxjs';
import { InventoryLog, AdjustInventoryRequest, AdjustInventoryResponse } from '../services/inventory.service';
import { MOCK_USER, MOCK_PRODUCTS } from './mock-data';

let mockInventoryLogs: InventoryLog[] = [
  {
    id: 1,
    variantId: 1,
    productName: 'Premium Laptop',
    variantName: 'Silver 512GB',
    quantityChange: 10,
    quantityBefore: 5,
    quantityAfter: 15,
    reason: 'Restock',
    notes: 'Neue Lieferung eingetroffen',
    userId: 1,
    userName: 'Demo User',
    createdAt: '2024-03-01T10:00:00'
  },
  {
    id: 2,
    variantId: 1,
    productName: 'Premium Laptop',
    variantName: 'Silver 512GB',
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

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
  variantId: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  constructor(private http: HttpClient) {}

  getCart(sessionId: string): Observable<Cart> {
    return this.http.get<Cart>(`${environment.publicApiUrl}/cart?sessionId=${sessionId}`);
  }

  addItem(request: AddToCartRequest): Observable<CartItem> {
    return this.http.post<CartItem>(`${environment.publicApiUrl}/cart/items`, request);
  }

  updateItem(itemId: number, quantity: number): Observable<CartItem> {
    return this.http.put<CartItem>(`${environment.publicApiUrl}/cart/items/${itemId}`, { quantity });
  }

  removeItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${environment.publicApiUrl}/cart/items/${itemId}`);
  }

  clearCart(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${environment.publicApiUrl}/cart/clear?sessionId=${sessionId}`);
  }

  getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = 'session-' + Math.random().toString(36).substring(7) + '-' + Date.now();
      localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  }
}

