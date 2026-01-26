import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { SavedCart, CreateSavedCartRequest, SavedCartToCartRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SavedCartService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Alle gespeicherten Warenkörbe eines Kunden abrufen
   */
  getSavedCarts(storeId: number): Observable<SavedCart[]> {
    return this.http.get<SavedCart[]>(`${this.apiUrl}/stores/${storeId}/saved-carts`);
  }

  /**
   * Einzelnen gespeicherten Warenkorb abrufen
   */
  getSavedCart(storeId: number, savedCartId: number): Observable<SavedCart> {
    return this.http.get<SavedCart>(`${this.apiUrl}/stores/${storeId}/saved-carts/${savedCartId}`);
  }

  /**
   * Aktuellen Warenkorb speichern
   */
  saveCurrentCart(request: CreateSavedCartRequest): Observable<SavedCart> {
    return this.http.post<SavedCart>(`${this.apiUrl}/stores/${request.storeId}/saved-carts`, request);
  }

  /**
   * Gespeicherten Warenkorb wiederherstellen
   */
  restoreSavedCart(storeId: number, request: SavedCartToCartRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/stores/${storeId}/saved-carts/${request.savedCartId}/restore`, request);
  }

  /**
   * Gespeicherten Warenkorb umbenennen
   */
  updateSavedCart(storeId: number, savedCartId: number, updates: Partial<CreateSavedCartRequest>): Observable<SavedCart> {
    return this.http.put<SavedCart>(`${this.apiUrl}/stores/${storeId}/saved-carts/${savedCartId}`, updates);
  }

  /**
   * Gespeicherten Warenkorb löschen
   */
  deleteSavedCart(storeId: number, savedCartId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stores/${storeId}/saved-carts/${savedCartId}`);
  }

  /**
   * Abgelaufene gespeicherte Warenkörbe bereinigen
   */
  cleanupExpiredCarts(storeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stores/${storeId}/saved-carts/cleanup`);
  }
}

