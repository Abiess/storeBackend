import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { MockCartService } from '../mocks/mock-cart.service';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import {SubdomainService} from "@app/core/services/subdomain.service";

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
  variantId?: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private mockService = new MockCartService();
  private cartApiUrl = `${environment.publicApiUrl}/cart`; // FIXED: /cart statt /simple-cart
  private storeId: number | null = null; // Typisierung geändert

  private cartUpdateSubject = new BehaviorSubject<void>(undefined);
  public cartUpdate$ = this.cartUpdateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private subDomainService: SubdomainService,
  ) {  }

  private getStoreId(): number {
    if (!this.storeId) {
      this.storeId = this.subDomainService.getCurrentStoreId();
      if (!this.storeId) {
        // Fallback: Versuche aus localStorage zu holen
        const storedStoreId = localStorage.getItem('last_store_id');
        if (storedStoreId) {
          this.storeId = parseInt(storedStoreId, 10);
          console.log('🏪 StoreId aus localStorage geladen:', this.storeId);
        }
      }

      if (!this.storeId) {
        console.error('❌ Keine storeId gefunden - verwende 0 als Fallback');
        // FIXED: Werfe keinen Error mehr, gebe 0 zurück
        return 0;
      }
      console.log('🏪 StoreId geladen:', this.storeId);
    }
    return this.storeId;
  }

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

  getCart(): Observable<Cart> {
    const storeId = this.getStoreId();
    if (environment.useMockData) {
      return this.mockService.getCart(storeId);
    }

    console.log('🛒 Lade Warenkorb für Store (java)', storeId );

    // FIXED: Sende sessionId auch für eingeloggte User (für Cart-Migration!)
    // Das Backend prüft ob ein Guest-Cart migriert werden muss
    const sessionId = localStorage.getItem('cart_session_id'); // Hole IMMER die sessionId
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

    // FIXED: Sende sessionId IMMER (auch für eingeloggte User, für Migration)
    const sessionId = localStorage.getItem('cart_session_id');
    const requestBody = sessionId
      ? { ...request, sessionId }
      : request;

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

  clearCart(): Observable<void> {
    const storeId = this.getStoreId();
    if (environment.useMockData) {
      return this.mockService.clearCart(storeId);
    }

    // FIXED: Sende sessionId für Guest-Support (Backend benötigt entweder Token oder sessionId)
    const sessionId = this.getOrCreateSessionId();
    return this.http.delete<void>(`${this.cartApiUrl}/clear?storeId=${storeId}&sessionId=${sessionId}`, {
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
  getCartItemCount(): Observable<number> {
    const storeId = this.getStoreId();
    if (environment.useMockData) {
      return this.mockService.getCart(storeId).pipe(
        map(cart => cart.itemCount)
      );
    }

    // FIXED: Füge sessionId für Guests hinzu
    const sessionId = this.isAuthenticated() ? null : this.getOrCreateSessionId();
      console.log("my storeid is ", storeId);
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

    // Entferne die Guest-Session-ID, damit ein neuer Guest-Cart erstellt wird
    localStorage.removeItem('cart_session_id');

    // Trigger Update für alle Components
    this.cartUpdateSubject.next();

    // Kurze Verzögerung, dann nochmal triggern um sicherzustellen,
    // dass alle Components den neuen User-Cart vom Server laden
    setTimeout(() => {
      console.log('🔄 Erzwinge finale Warenkorb-Neuladung');
      this.cartUpdateSubject.next();
    }, 100);
  }

  /**
   * Triggert ein Warenkorb-Update OHNE die Session-ID zu löschen
   * Wird beim Login/Registrierung verwendet, damit der Guest-Cart migriert wird
   */
  triggerCartUpdate(): void {
    console.log('🔄 Trigger Warenkorb-Update (für Cart-Migration)');

    // WICHTIG: Wir löschen die cart_session_id NICHT, damit das Backend sie für die Migration nutzen kann
    // Das Backend wird den Guest-Cart automatisch mit dem User-Cart mergen

    // Trigger Update für alle Components
    this.cartUpdateSubject.next();

    // Nach kurzer Verzögerung nochmal triggern
    setTimeout(() => {
      console.log('🔄 Erzwinge Warenkorb-Neuladung nach Migration');
      this.cartUpdateSubject.next();

      // JETZT können wir die cart_session_id entfernen, nachdem die Migration erfolgt ist
      setTimeout(() => {
        localStorage.removeItem('cart_session_id');
        console.log('🧹 Guest-Session-ID entfernt nach erfolgreicher Migration');
      }, 500);
    }, 100);
  }
}
