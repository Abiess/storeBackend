import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SavedCartItem {
  id: number;
  savedCartId: number;
  productId: number;
  variantId: number;
  quantity: number;
  priceSnapshot: number;
  productSnapshot?: string;
  createdAt: Date;
  productTitle?: string;
  productImageUrl?: string;
}

export interface SavedCart {
  id: number;
  storeId: number;
  customerId: number;
  name: string;
  description?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: SavedCartItem[];
  itemCount: number;
  totalAmount: number;
  isExpired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SavedCartService {
  private apiUrl = `${environment.apiUrl}/api/customer/saved-carts`;

  constructor(private http: HttpClient) {}

  /**
   * Alle gespeicherten Warenkörbe eines Kunden abrufen
   */
  getSavedCarts(storeId: number): Observable<SavedCart[]> {
    return this.http.get<SavedCart[]>(`${this.apiUrl}?storeId=${storeId}`);
  }

  /**
   * Einzelnen gespeicherten Warenkorb abrufen
   */
  getSavedCart(savedCartId: number): Observable<SavedCart> {
    return this.http.get<SavedCart>(`${this.apiUrl}/${savedCartId}`);
  }

  /**
   * Aktuellen Warenkorb speichern
   */
  saveCart(storeId: number, name: string, description: string, items: SavedCartItem[], expirationDays?: number): Observable<SavedCart> {
    return this.http.post<SavedCart>(this.apiUrl, {
      storeId,
      name,
      description,
      items,
      expirationDays
    });
  }

  /**
   * Gespeicherten Warenkorb wiederherstellen
   */
  restoreSavedCart(savedCartId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${savedCartId}/restore`, {});
  }

  /**
   * Gespeicherten Warenkorb löschen
   */
  deleteSavedCart(savedCartId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${savedCartId}`);
  }

  /**
   * Anzahl gespeicherter Warenkörbe
   */
  getSavedCartCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/count`);
  }

  /**
   * Abgelaufene gespeicherte Warenkörbe bereinigen (Admin)
   */
  cleanupExpiredCarts(): Observable<{ deletedCount: number }> {
    return this.http.post<{ deletedCount: number }>(`${this.apiUrl}/cleanup-expired`, {});
  }
}
