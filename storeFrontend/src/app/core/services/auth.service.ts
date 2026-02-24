import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // FIXED: CartService wird später injiziert um zirkuläre Abhängigkeit zu vermeiden
  private cartService?: any;

  constructor(private http: HttpClient) {
    // Load user from localStorage if exists
    const token = this.getToken();
    if (token) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser && storedUser !== 'undefined') {
        try {
          const user = JSON.parse(storedUser);
          this.currentUserSubject.next(user);
        } catch (e) {
          console.error('Fehler beim Parsen des gespeicherten Users:', e);
          this.validateTokenWithBackend();
        }
      } else {
        // Token vorhanden, aber kein User gespeichert - hole vom Backend
        this.validateTokenWithBackend();
      }
    }
  }

  /**
   * Validiert den Token mit dem Backend und lädt User-Daten
   */
  private validateTokenWithBackend(): void {
    this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(
        catchError(error => {
          console.error('Token-Validierung fehlgeschlagen:', error);
          this.logout();
          return of(null);
        })
      )
      .subscribe(user => {
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          console.log('User erfolgreich vom Backend geladen:', user.email);
        }
      });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Store token and user
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);

          // FIXED: Nach Login - Trigger Warenkorb-Update (Guest-Cart wird migriert!)
          // WICHTIG: Wir rufen NICHT clearLocalCart() auf, weil das den Warenkorb leert
          // Stattdessen triggern wir nur ein Update, damit der migrierte Cart geladen wird
          console.log('✅ Login erfolgreich - Trigger Warenkorb-Update für Migration');
          if (this.cartService) {
            this.cartService.triggerCartUpdate();
          }
        })
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap(response => {
          // FIXED: Debug-Ausgabe für Token-Speicherung
          console.log('📝 Registrierung erfolgreich - Response:', response);
          console.log('🔑 Token erhalten:', response.token ? 'Ja (Länge: ' + response.token.length + ')' : 'Nein');
          console.log('👤 User:', response.user);

          // Store token and user after successful registration - FIXED: use 'auth_token' everywhere
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);

          // FIXED: Verifiziere sofort, dass Token gespeichert wurde
          const storedToken = localStorage.getItem('auth_token');
          console.log('✅ Token gespeichert:', storedToken ? 'Ja (Länge: ' + storedToken.length + ')' : 'Nein');
          console.log('🔍 Token-Vergleich:', storedToken === response.token ? 'Identisch ✅' : 'UNTERSCHIEDLICH ❌');

          // FIXED: Nach Registrierung - Trigger Warenkorb-Update (Guest-Cart wird migriert!)
          console.log('✅ Registrierung erfolgreich - Trigger Warenkorb-Update für Migration');
          if (this.cartService) {
            this.cartService.triggerCartUpdate();
          }
        })
      );
  }

  /**
   * Setzt CartService-Referenz (wird von AppComponent aufgerufen)
   */
  setCartService(cartService: any): void {
    this.cartService = cartService;
  }

  logout(): void {
    console.log('🚪 Logout - Bereinige Session und Warenkorb');

    // FIXED: Entferne alle benutzerspezifischen Daten
    localStorage.removeItem('auth_token');
    localStorage.removeItem('currentUser');

    // FIXED: Setze sessionId zurück, damit neuer User neuen Warenkorb bekommt
    localStorage.removeItem('cart_session_id');

    this.currentUserSubject.next(null);

    // FIXED: Bereinige Warenkorb-Cache
    if (this.cartService) {
      this.cartService.clearLocalCart();
    }

    console.log('✅ Logout abgeschlossen - Session und Warenkorb bereinigt');
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null && !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Gibt die E-Mail des aktuell eingeloggten Users zurück
   */
  getCurrentUserEmail(): string | null {
    const user = this.currentUserSubject.value;
    return user?.email || null;
  }

  /**
   * Öffentliche Methode zum manuellen Neuladen des Users
   */
  reloadCurrentUser(): Observable<User | null> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(
        tap(user => {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          console.error('Fehler beim Neuladen des Users:', error);
          return of(null);
        })
      );
  }

  /**
   * Prüft ob User eingeloggt ist
   */
  isLoggedIn(): boolean {
    return !!this.getToken() && this.currentUserSubject.value !== null;
  }

  /**
   * Prüft ob User ausgeloggt ist
   */
  isLoggedOut(): boolean {
    return !this.isLoggedIn();
  }
}
