import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WishlistItem {
  id: number;
  wishlistId: number;
  productId: number;
  variantId?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  note?: string;
  addedAt: Date;
  productTitle?: string;
  productPrice?: number;
  productImageUrl?: string;
  inStock?: boolean;
}

export interface Wishlist {
  id: number;
  storeId: number;
  customerId: number;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
  items: WishlistItem[];
  itemCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = `${environment.apiUrl}/customer/wishlists`;
  private wishlistCountSubject = new BehaviorSubject<number>(0);
  public wishlistCount$ = this.wishlistCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadWishlistCount();
  }

  /**
   * Alle Wishlists eines Kunden abrufen
   */
  getWishlists(storeId: number): Observable<Wishlist[]> {
    return this.http.get<Wishlist[]>(`${this.apiUrl}?storeId=${storeId}`);
  }

  /**
   * Standard-Wishlist abrufen (oder erstellen falls nicht vorhanden)
   */
  getDefaultWishlist(storeId: number): Observable<Wishlist> {
    return this.http.get<Wishlist>(`${this.apiUrl}/default?storeId=${storeId}`);
  }

  /**
   * Einzelne Wishlist mit Items abrufen
   */
  getWishlist(wishlistId: number): Observable<Wishlist> {
    return this.http.get<Wishlist>(`${this.apiUrl}/${wishlistId}`);
  }

  /**
   * Öffentliche Wishlist über Share-Token abrufen
   */
  getPublicWishlist(shareToken: string): Observable<Wishlist> {
    return this.http.get<Wishlist>(`${this.apiUrl}/shared/${shareToken}`);
  }

  /**
   * Neue Wishlist erstellen
   */
  createWishlist(storeId: number, name: string, description?: string): Observable<Wishlist> {
    return this.http.post<Wishlist>(`${this.apiUrl}?storeId=${storeId}&name=${name}${description ? '&description=' + description : ''}`, {});
  }

  /**
   * Produkt zur Wishlist hinzufügen
   */
  addToWishlist(wishlistId: number, productId: number, variantId?: number, priority: string = 'MEDIUM', note?: string): Observable<WishlistItem> {
    return this.http.post<WishlistItem>(`${this.apiUrl}/${wishlistId}/items`, {
      productId,
      variantId,
      priority,
      note
    }).pipe(tap(() => this.loadWishlistCount()));
  }

  /**
   * Produkt aus Wishlist entfernen
   */
  removeFromWishlist(wishlistId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${wishlistId}/items/${itemId}`)
      .pipe(tap(() => this.loadWishlistCount()));
  }

  /**
   * Wishlist teilen
   */
  shareWishlist(wishlistId: number, makePublic: boolean = true): Observable<{ shareToken: string }> {
    return this.http.post<{ shareToken: string }>(`${this.apiUrl}/${wishlistId}/share?makePublic=${makePublic}`, {});
  }

  /**
   * Wishlist löschen
   */
  deleteWishlist(wishlistId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${wishlistId}`);
  }

  /**
   * Anzahl der Items in allen Wishlists abrufen
   */
  getWishlistItemCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/count`)
      .pipe(tap(result => this.wishlistCountSubject.next(result.count)));
  }

  /**
   * Wishlist-Count laden
   */
  private loadWishlistCount(): void {
    this.getWishlistItemCount().subscribe();
  }
}
