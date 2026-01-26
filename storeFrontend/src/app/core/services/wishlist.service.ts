import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Wishlist, WishlistItem, CreateWishlistRequest, AddToWishlistRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = environment.apiUrl;
  private wishlistCountSubject = new BehaviorSubject<number>(0);
  public wishlistCount$ = this.wishlistCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Alle Wishlists eines Kunden abrufen
   */
  getWishlists(storeId: number): Observable<Wishlist[]> {
    return this.http.get<Wishlist[]>(`${this.apiUrl}/stores/${storeId}/wishlists`);
  }

  /**
   * Standard-Wishlist abrufen (oder erstellen falls nicht vorhanden)
   */
  getDefaultWishlist(storeId: number): Observable<Wishlist> {
    return this.http.get<Wishlist>(`${this.apiUrl}/stores/${storeId}/wishlists/default`);
  }

  /**
   * Einzelne Wishlist mit Items abrufen
   */
  getWishlist(storeId: number, wishlistId: number): Observable<Wishlist> {
    return this.http.get<Wishlist>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}`);
  }

  /**
   * Neue Wishlist erstellen
   */
  createWishlist(request: CreateWishlistRequest): Observable<Wishlist> {
    return this.http.post<Wishlist>(`${this.apiUrl}/stores/${request.storeId}/wishlists`, request);
  }

  /**
   * Wishlist umbenennen
   */
  updateWishlist(storeId: number, wishlistId: number, updates: Partial<CreateWishlistRequest>): Observable<Wishlist> {
    return this.http.put<Wishlist>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}`, updates);
  }

  /**
   * Wishlist löschen
   */
  deleteWishlist(storeId: number, wishlistId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}`);
  }

  /**
   * Produkt zur Wishlist hinzufügen
   */
  addToWishlist(storeId: number, request: AddToWishlistRequest): Observable<WishlistItem> {
    return this.http.post<WishlistItem>(`${this.apiUrl}/stores/${storeId}/wishlists/${request.wishlistId}/items`, request)
      .pipe(tap(() => this.updateWishlistCount(storeId)));
  }

  /**
   * Produkt aus Wishlist entfernen
   */
  removeFromWishlist(storeId: number, wishlistId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}/items/${itemId}`)
      .pipe(tap(() => this.updateWishlistCount(storeId)));
  }

  /**
   * Prüfen ob Produkt in Wishlist ist
   */
  isInWishlist(storeId: number, productId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/stores/${storeId}/wishlists/check/${productId}`);
  }

  /**
   * Wishlist-Item Notiz aktualisieren
   */
  updateItemNote(storeId: number, wishlistId: number, itemId: number, note: string): Observable<WishlistItem> {
    return this.http.put<WishlistItem>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}/items/${itemId}`, { note });
  }

  /**
   * Wishlist-Item Priorität setzen
   */
  updateItemPriority(storeId: number, wishlistId: number, itemId: number, priority: 'LOW' | 'MEDIUM' | 'HIGH'): Observable<WishlistItem> {
    return this.http.put<WishlistItem>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}/items/${itemId}`, { priority });
  }

  /**
   * Anzahl der Items in allen Wishlists abrufen
   */
  getWishlistItemCount(storeId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/stores/${storeId}/wishlists/count`)
      .pipe(tap(count => this.wishlistCountSubject.next(count)));
  }

  /**
   * Wishlist-Count aktualisieren
   */
  private updateWishlistCount(storeId: number): void {
    this.getWishlistItemCount(storeId).subscribe();
  }

  /**
   * Alle Items aus Wishlist in den Warenkorb verschieben
   */
  moveWishlistToCart(storeId: number, wishlistId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/stores/${storeId}/wishlists/${wishlistId}/move-to-cart`, {})
      .pipe(tap(() => this.updateWishlistCount(storeId)));
  }
}

