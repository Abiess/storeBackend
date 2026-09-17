import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User, AuthResponse, RegistrationResponse, LoginRequest, RegisterRequest } from '../models';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { StorageAdapter } from './storage-adapter';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageAdapter);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // FIXED: CartService wird später injiziert um zirkuläre Abhängigkeit zu vermeiden
  private cartService?: any;

  /**
   * In-Memory-Cache des Tokens (M3a).
   *
   * `StorageAdapter` ist async (native Secure Storage auf Android/iOS ist
   * grundsätzlich async). Sehr viele Stellen (AuthGuard, AuthInterceptor,
   * RoleService, diverse Fach-Services) rufen `getToken()`/`isAuthenticated()`
   * aber synchron auf – ein Rewrite all dieser Call-Sites auf async wäre ein
   * riskanter Rewrite über weite Teile der App. Deshalb: Der Token wird EINMAL
   * beim App-Start async aus dem `StorageAdapter` geladen (`initialize()`,
   * per APP_INITIALIZER) und danach synchron aus diesem In-Memory-Feld
   * gelesen. Alle Schreibvorgänge (Login/Logout/Reload) aktualisieren dieses
   * Feld SOFORT synchron und persistieren zusätzlich (fire-and-forget) async
   * in den Storage. Das ist bewusst KEIN Promise-Caching-Hack, sondern ein
   * normaler In-Memory-State, der von einer async-geladenen Quelle gespeist
   * wird – siehe ARCHITECTURE_APP_FACTORY.md §M3a.
   */
  private tokenCache: string | null = null;

  /** true sobald `initialize()` (App-Start) abgeschlossen ist. */
  private readySubject = new BehaviorSubject<boolean>(false);
  public authReady$ = this.readySubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Muss beim App-Start EINMAL (vor Routing/Guards) aufgerufen werden, siehe
   * APP_INITIALIZER in `app.config.ts`:
   *
   *   App Start → Storage initialisieren → Token/User laden → Auth ready → Routing/Guards
   *
   * Lädt Token + User async aus dem `StorageAdapter` (Web: localStorage,
   * Android/iOS: Secure Storage) in den In-Memory-Cache.
   */
  async initialize(): Promise<void> {
    try {
      const token = await this.storage.get('auth_token');
      this.tokenCache = token;

      if (token) {
        // FIXED: Zuerst prüfen ob Token client-seitig noch gültig ist
        if (this.isTokenExpired(token)) {
          console.warn('⏰ JWT Token ist abgelaufen – bereinige Session automatisch');
          this.clearSession();
        } else {
          const storedUser = await this.storage.get('currentUser');
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
    } finally {
      this.readySubject.next(true);
    }
  }

  /**
   * Prüft ob ein JWT Token client-seitig abgelaufen ist (ohne Backend-Aufruf)
   */
  isTokenExpired(token?: string | null): boolean {
    const t = token ?? this.getToken();
    if (!t) return true;
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      // exp ist in Sekunden, Date.now() in Millisekunden
      return payload.exp * 1000 < Date.now();
    } catch {
      return true; // Im Zweifel: als abgelaufen behandeln
    }
  }

  /**
   * Bereinigt Session ohne Redirect (z.B. bei abgelaufenem Token beim App-Start)
   *
   * In-Memory-State wird SOFORT synchron bereinigt, die Persistenz läuft
   * async im Hintergrund (fire-and-forget). `cart_session_id` läuft bewusst
   * NICHT über den `StorageAdapter` (kein Secure-Storage-Bedarf, siehe
   * ARCHITECTURE_APP_FACTORY.md §M3a "Welche Werte brauchen Secure Storage").
   */
  private clearSession(): void {
    this.tokenCache = null;
    this.currentUserSubject.next(null);
    void this.storage.remove('auth_token');
    void this.storage.remove('currentUser');
    localStorage.removeItem('cart_session_id');
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
          this.currentUserSubject.next(user);
          void this.storage.set('currentUser', JSON.stringify(user));
          console.log('User erfolgreich vom Backend geladen:', user.email);
        }
      });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Store token and user: In-Memory sofort synchron, Persistenz async
          // im Hintergrund (fire-and-forget) – siehe `tokenCache`-Doku oben.
          this.tokenCache = response.token;
          this.currentUserSubject.next(response.user);
          void this.storage.set('auth_token', response.token);
          void this.storage.set('currentUser', JSON.stringify(response.user));

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

  /**
   * Registriert einen neuen Benutzer.
   * 
   * SECURITY: Speichert KEINEN Token!
   * Der Benutzer muss erst seine E-Mail-Adresse bestätigen bevor er sich anmelden kann.
   * 
   * @returns RegistrationResponse ohne Token
   */
  register(data: RegisterRequest): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap(response => {
          // SECURITY: KEINE personenbezogenen Daten in Production-Logs
          if (!environment.production) {
            console.log('📝 Registrierung erfolgreich:', response.email);
            console.log('📧 E-Mail-Bestätigung erforderlich');
          } else {
            console.log('📝 Registrierung erfolgreich - Bestätigungs-E-Mail gesendet');
          }

          // SECURITY: KEINEN Token speichern!
          // KEIN storage.set('auth_token', ...)
          // KEIN currentUserSubject.next(...)
          // KEINE Warenkorb-Migration!
          
          // User ist NICHT angemeldet und kann erst nach Email-Bestätigung + Login zugreifen
        })
      );
  }

  /**
   * Setzt CartService-Referenz (wird von AppComponent aufgerufen)
   */
  setCartService(cartService: any): void {
    this.cartService = cartService;
  }

  /**
   * Sendet die Verifikations-Email erneut.
   * Nutzt POST /api/auth/resend-verification
   */
  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/resend-verification`,
      { email }
    );
  }

  logout(): void {
    console.log('🚪 Logout - Bereinige Session und Warenkorb');

    // In-Memory sofort synchron bereinigen (Guards/Interceptor lesen sofort
    // den korrekten "ausgeloggt"-Zustand), Persistenz async im Hintergrund.
    this.tokenCache = null;
    this.currentUserSubject.next(null);
    void this.storage.remove('auth_token');
    void this.storage.remove('currentUser');

    // FIXED: Setze sessionId zurück, damit neuer User neuen Warenkorb bekommt.
    // `cart_session_id` läuft bewusst NICHT über StorageAdapter (kein
    // Secure-Storage-Bedarf).
    localStorage.removeItem('cart_session_id');

    // FIXED: Bereinige Warenkorb-Cache
    if (this.cartService) {
      this.cartService.clearLocalCart();
    }

    console.log('✅ Logout abgeschlossen - Session und Warenkorb bereinigt');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      // Token fehlt oder abgelaufen → Session bereinigen
      if (token) {
        console.warn('⏰ isAuthenticated: Token abgelaufen – bereinige Session');
        this.clearSession();
      }
      return false;
    }

    // FIX: Race Condition – currentUserSubject kann nach anonymer Store-Erstellung
    // noch null sein, obwohl Token + User bereits im Storage liegen.
    // `StorageAdapter` ist async → kann hier NICHT mehr synchron nachgeladen
    // werden (M3a). Stattdessen asynchron im Hintergrund nachladen; der
    // gültige Token reicht bereits aus, um synchron `true` zurückzugeben.
    if (!this.currentUserSubject.value) {
      void this.reloadUserFromStorageOrBackend();
    }

    // Gültiger Token = eingeloggt (auch wenn User-Objekt noch async lädt)
    return true;
  }

  /**
   * Lädt den User asynchron aus dem Storage nach (Fallback für M3a, da
   * `isAuthenticated()`/`getToken()` synchron bleiben müssen). Fällt auf
   * Backend-Validierung zurück, falls im Storage kein/kein gültiger User
   * gefunden wird.
   */
  private async reloadUserFromStorageOrBackend(): Promise<void> {
    try {
      const storedUser = await this.storage.get('currentUser');
      if (this.currentUserSubject.value) return; // inzwischen bereits gesetzt
      if (storedUser && storedUser !== 'undefined') {
        try {
          this.currentUserSubject.next(JSON.parse(storedUser));
          console.log('🔄 isAuthenticated: User aus Storage nachgeladen');
          return;
        } catch (e) {
          console.error('Fehler beim Parsen des gespeicherten Users:', e);
        }
      }
      this.validateTokenWithBackend();
    } catch (e) {
      console.error('Fehler beim Nachladen des Users aus Storage:', e);
      this.validateTokenWithBackend();
    }
  }

  /**
   * Öffentliche Methode: User + Token manuell setzen (z.B. nach anonymer
   * Store-Erstellung, Phone-Auth). Ersetzt das frühere Pattern
   * "localStorage.setItem(...) + setAuthFromStorage()" (M3a): schreibt sowohl
   * synchron in den In-Memory-State als auch async in den `StorageAdapter`,
   * sodass es auf Android/iOS korrekt in Secure Storage landet.
   */
  setSession(token: string, user: User): void {
    this.tokenCache = token;
    this.currentUserSubject.next(user);
    void this.storage.set('auth_token', token);
    void this.storage.set('currentUser', JSON.stringify(user));
  }

  /**
   * Aktualisiert den aktuell eingeloggten User teilweise (z.B. nachträglich
   * gespeicherte E-Mail) und optional den Token, ohne den gesamten
   * localStorage-Bypass zu benötigen (M3a).
   */
  updateCurrentUser(patch: Partial<User>, newToken?: string): void {
    const current = this.currentUserSubject.value ?? ({} as User);
    const updated = { ...current, ...patch } as User;
    this.currentUserSubject.next(updated);
    void this.storage.set('currentUser', JSON.stringify(updated));

    if (newToken) {
      this.tokenCache = newToken;
      void this.storage.set('auth_token', newToken);
    }
  }

  /**
   * Öffentliche Methode: User + Token manuell setzen (z.B. nach anonymer Store-Erstellung)
   */
  setAuthFromStorage(): void {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) return;

    this.storage.get('currentUser')
      .then(storedUser => {
        if (storedUser && storedUser !== 'undefined') {
          try {
            const user = JSON.parse(storedUser);
            this.currentUserSubject.next(user);
            console.log('✅ Auth aus Storage geladen:', user.email);
          } catch (e) {
            console.error('Fehler beim Parsen des Users:', e);
            this.validateTokenWithBackend();
          }
        }
      })
      .catch(e => console.error('Fehler beim Laden des Users aus Storage:', e));
  }

  getToken(): string | null {
    return this.tokenCache;
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
          this.currentUserSubject.next(user);
          void this.storage.set('currentUser', JSON.stringify(user));
        }),
        catchError(error => {
          console.error('Fehler beim Neuladen des Users:', error);
          return of(null);
        })
      );
  }

  /**
   * Prüft ob User eingeloggt ist (inkl. Token-Expiry-Check)
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Prüft ob User ausgeloggt ist
   */
  isLoggedOut(): boolean {
    return !this.isLoggedIn();
  }
}
