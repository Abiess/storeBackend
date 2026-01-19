import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { MockCartService } from '../mocks/mock-cart.service';
import { map, catchError, tap } from 'rxjs/operators';
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

  // FIXED: BehaviorSubject für Warenkorb-Updates
  private cartUpdateSubject = new BehaviorSubject<void>(undefined);
  public cartUpdate$ = this.cartUpdateSubject.asObservable();

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
   * Generiert oder holt eine Session-ID für Guest-User
   * Diese ID wird im localStorage gespeichert und für alle Guest-Cart-Operationen verwendet
   */
  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      // Generiere eine zufällige Session-ID für Guests
      sessionId = 'guest-' + Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15);
      localStorage.setItem('cart_session_id', sessionId);
      console.log('🆕 Neue Guest-Session-ID erstellt:', sessionId);
    }
    return sessionId;
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

    console.log('🛒 Lade Warenkorb für Store', storeId);

    // Für Guests: Füge sessionId als Query-Parameter hinzu
    const sessionId = this.isAuthenticated() ? null : this.getOrCreateSessionId();
    const url = sessionId
      ? `${this.cartApiUrl}?storeId=${storeId}&sessionId=${sessionId}`
      : `${this.cartApiUrl}?storeId=${storeId}`;

    return this.http.get<Cart>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(cart => {
        console.log('📦 Warenkorb geladen:', cart.itemCount, 'Items');
      }),
      catchError(error => {
        console.warn('⚠️ Fehler beim Laden des Warenkorbs:', error);
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

    console.log('➕ Füge Produkt zum Warenkorb hinzu (Guest Cart unterstützt)');

    // FIXED: Füge sessionId für Guests automatisch hinzu
    const requestBody = this.isAuthenticated()
      ? request
      : { ...request, sessionId: this.getOrCreateSessionId() };

    return this.http.post<any>(`${this.cartApiUrl}/items`, requestBody, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.cartUpdateSubject.next(); // Trigger Update
      }),
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

    return this.http.put<any>(`${this.cartApiUrl}/items/${itemId}`, { quantity }, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.cartUpdateSubject.next(); // Trigger Update
      }),
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

    return this.http.delete<void>(`${this.cartApiUrl}/items/${itemId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.cartUpdateSubject.next(); // Trigger Update
      }),
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

    return this.http.delete<void>(`${this.cartApiUrl}/clear?storeId=${storeId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('🗑️ Warenkorb geleert');
        this.cartUpdateSubject.next(); // Trigger Update
      }),
      catchError(error => {
        console.error('❌ Fehler beim Leeren des Warenkorbs:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gibt die Anzahl der Items im Warenkorb zurück
   * FIXED: Funktioniert jetzt auch ohne Login (mit sessionId für Guests)
   */
  getCartItemCount(storeId: number): Observable<number> {
    if (environment.useMockData) {
      return this.mockService.getCart(storeId).pipe(
        map(cart => cart.itemCount)
      );
    }

    // FIXED: Füge sessionId für Guests hinzu
    const sessionId = this.isAuthenticated() ? null : this.getOrCreateSessionId();
    const url = sessionId
      ? `${this.cartApiUrl}/count?storeId=${storeId}&sessionId=${sessionId}`
      : `${this.cartApiUrl}/count?storeId=${storeId}`;

    return this.http.get<any>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.count || 0),
      catchError(error => {
        console.warn('⚠️ Fehler beim Laden der Cart-Count:', error);
        return of(0);
      })
    );
  }

  /**
   * FIXED: Bereinigt den lokalen Warenkorb-Cache beim Logout/User-Wechsel
   * Triggert ein Update, damit alle Components den Warenkorb neu laden
   */
  clearLocalCart(): void {
    console.log('🧹 Bereinige lokalen Warenkorb-Cache (zwinge Neuladung)');

    // Wichtig: Trigger zweimal für sofortiges Reset + Neuladung
    // 1. Sofortiges Signal für Components, dass Cart leer ist
    // 2. Nach kurzem Delay erneutes Signal zum Neuladen vom Server
    this.cartUpdateSubject.next();

    // Kurze Verzögerung, dann nochmal triggern um sicherzustellen,
    // dass alle Components den neuen User-Cart vom Server laden
    setTimeout(() => {
      console.log('🔄 Erzwinge finale Warenkorb-Neuladung');
      this.cartUpdateSubject.next();
    }, 100);
  }
}
