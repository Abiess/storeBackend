# Warenkorb User-Wechsel Fix - Vollständige Lösung

## Problem
Wenn sich ein Benutzer abmeldet und sich mit einem anderen Benutzer anmeldet, sieht der neue Benutzer noch den Warenkorb des vorherigen Benutzers. **Dies ist ein kritisches Sicherheitsproblem!**

## Alle Szenarien

### ✅ Szenario 1: User A → Logout → User B Login
**Erwartetes Verhalten:** User B sieht einen leeren oder seinen eigenen Warenkorb, NICHT den von User A

**Vor dem Fix:**
```
1. User A meldet sich an (alice@example.com)
2. User A fügt Produkte zum Warenkorb hinzu (3 Items)
3. User A meldet sich ab
4. User B meldet sich an (bob@example.com)
5. ❌ User B sieht Warenkorb von User A (3 Items) ← FALSCH!
```

**Nach dem Fix:**
```
1. User A meldet sich an (alice@example.com)
2. User A fügt Produkte zum Warenkorb hinzu (3 Items)
3. User A meldet sich ab
   → localStorage wird bereinigt
   → cart_session_id wird entfernt
   → Warenkorb-Cache wird geleert
4. User B meldet sich an (bob@example.com)
5. ✅ User B sieht seinen eigenen Warenkorb (leer oder seine Items)
```

### ✅ Szenario 2: User A → Logout → User A Login (wieder anmelden)
**Erwartetes Verhalten:** User A sieht seinen eigenen Warenkorb wieder

**Nach dem Fix:**
```
1. User A meldet sich an (alice@example.com)
2. User A fügt Produkte zum Warenkorb hinzu (3 Items)
3. User A meldet sich ab
4. User A meldet sich wieder an (alice@example.com)
5. ✅ User A sieht seinen eigenen Warenkorb (3 Items vom Server)
```

### ✅ Szenario 3: Guest → Login
**Erwartetes Verhalten:** Guest-Warenkorb wird beim Login migriert (optional, Backend-Logik)

**Nach dem Fix:**
```
1. Guest fügt Produkte hinzu (2 Items im Guest-Cart)
2. Guest meldet sich an (alice@example.com)
3. ✅ Backend kann Guest-Cart mit User-Cart mergen (falls implementiert)
   ODER
   ✅ User-Cart wird geladen (Guest-Cart wird verworfen)
```

### ✅ Szenario 4: User → Logout → Guest → Weiter einkaufen
**Erwartetes Verhalten:** Guest kann ohne Login weiter einkaufen

**Nach dem Fix:**
```
1. User A meldet sich an und fügt Items hinzu
2. User A meldet sich ab
   → Warenkorb wird bereinigt
3. Guest (nicht angemeldet) fügt neue Produkte hinzu
4. ✅ Guest-Cart funktioniert unabhängig vom User-Cart
```

---

## Implementierte Änderungen

### 1. AuthService (`auth.service.ts`)

**Änderungen beim Logout:**
```typescript
logout(): void {
  console.log('🚪 Logout - Bereinige Session und Warenkorb');
  
  // Entferne alle benutzerspezifischen Daten
  localStorage.removeItem('auth_token');
  localStorage.removeItem('currentUser');
  
  // WICHTIG: Setze sessionId zurück, damit neuer User neuen Warenkorb bekommt
  localStorage.removeItem('cart_session_id');
  
  this.currentUserSubject.next(null);
  
  // Bereinige Warenkorb-Cache
  if (this.cartService) {
    this.cartService.clearLocalCart();
  }
  
  console.log('✅ Logout abgeschlossen - Session und Warenkorb bereinigt');
}
```

**Änderungen beim Login:**
```typescript
login(credentials: LoginRequest): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
    .pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
        
        // Nach Login - Warenkorb neu laden (für User-spezifischen Cart)
        console.log('✅ Login erfolgreich - Warenkorb wird neu geladen');
        if (this.cartService) {
          this.cartService.clearLocalCart(); // Trigger Update
        }
      })
    );
}
```

### 2. CartService (`cart.service.ts`)

**Neues Feature: BehaviorSubject für Warenkorb-Updates**
```typescript
// BehaviorSubject für Warenkorb-Updates
private cartUpdateSubject = new BehaviorSubject<void>(undefined);
public cartUpdate$ = this.cartUpdateSubject.asObservable();

/**
 * Bereinigt den lokalen Warenkorb-Cache beim Logout/User-Wechsel
 * Triggert ein Update, damit alle Components den Warenkorb neu laden
 */
clearLocalCart(): void {
  console.log('🧹 Bereinige lokalen Warenkorb-Cache');
  this.cartUpdateSubject.next();
}
```

**Alle Cart-Operationen triggern jetzt Updates:**
```typescript
addItem(request: AddToCartRequest): Observable<any> {
  return this.http.post<any>(`${this.cartApiUrl}/items`, request, {
    headers: this.getAuthHeaders()
  }).pipe(
    tap(() => {
      this.cartUpdateSubject.next(); // Trigger Update
    }),
    // ...
  );
}
```

### 3. AppComponent (`app.component.ts`)

**Verbindung zwischen AuthService und CartService:**
```typescript
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Verbinde AuthService mit CartService für Warenkorb-Bereinigung beim Logout
    this.authService.setCartService(this.cartService);
    console.log('✅ AuthService und CartService verbunden');
  }
}
```

### 4. CartComponent & StorefrontComponent

**Subscription auf Warenkorb-Updates:**
```typescript
export class CartComponent implements OnInit, OnDestroy {
  private cartUpdateSubscription?: Subscription;

  ngOnInit(): void {
    this.loadCart();
    
    // Höre auf Warenkorb-Updates (z.B. nach Logout/Login)
    this.cartUpdateSubscription = this.cartService.cartUpdate$.subscribe(() => {
      console.log('🔄 Warenkorb-Update erkannt - lade neu');
      this.loadCart();
    });
  }

  ngOnDestroy(): void {
    if (this.cartUpdateSubscription) {
      this.cartUpdateSubscription.unsubscribe();
    }
  }
}
```

---

## Test-Szenarien zum Verifizieren

### Test 1: User-Wechsel
```
1. Öffne Browser (Chrome)
2. Gehe zu http://localhost:4200/storefront/1
3. Melde dich als User A an (alice@example.com)
4. Füge 3 Produkte zum Warenkorb hinzu
5. Öffne DevTools → Console → Schau dir localStorage an
   - Sollte auth_token haben
   - Warenkorb zeigt 3 Items
6. Klicke "Abmelden"
   - Console sollte zeigen: "🚪 Logout - Bereinige Session und Warenkorb"
   - Console sollte zeigen: "✅ Logout abgeschlossen - Session und Warenkorb bereinigt"
   - localStorage sollte KEIN auth_token mehr haben
   - localStorage sollte KEINE cart_session_id haben
7. Melde dich als User B an (bob@example.com)
   - Console sollte zeigen: "✅ Login erfolgreich - Warenkorb wird neu geladen"
   - Console sollte zeigen: "🔄 Warenkorb-Update erkannt - lade neu"
8. ✅ ERWARTUNG: Warenkorb zeigt 0 Items (oder Bob's eigene Items vom Server)
9. ❌ FEHLER: Warenkorb zeigt noch 3 Items von Alice
```

### Test 2: Wieder-Anmeldung
```
1. Melde dich als User A an (alice@example.com)
2. Füge 2 Produkte zum Warenkorb hinzu
3. Melde dich ab
4. Melde dich wieder als User A an (alice@example.com)
5. ✅ ERWARTUNG: Warenkorb zeigt 2 Items (vom Server geladen)
```

### Test 3: Guest Cart
```
1. Öffne Browser ohne Login
2. Füge 1 Produkt zum Warenkorb hinzu
3. Melde dich an (alice@example.com)
4. ✅ ERWARTUNG: 
   - Entweder Guest-Cart wird mit User-Cart gemergt (Backend-Logik)
   - Oder User-Cart wird geladen (Guest-Cart wird verworfen)
```

### Test 4: Multi-Browser Test
```
1. Browser 1 (Chrome): Login als Alice → Füge 3 Items hinzu
2. Browser 2 (Firefox): Login als Bob → Füge 2 Items hinzu
3. Browser 1: Logout
4. Browser 1: Login als Bob
5. ✅ ERWARTUNG: Browser 1 zeigt 2 Items (Bob's Cart vom Server)
6. Browser 2: Refresh
7. ✅ ERWARTUNG: Browser 2 zeigt immer noch 2 Items (Bob's Cart)
```

---

## Backend-Anforderungen (bereits implementiert)

Das Backend muss folgendes unterstützen:

### 1. JWT-basierte Warenkorb-Zuordnung
```java
@GetMapping
public ResponseEntity<CartDTO> getCart(
    @RequestParam Long storeId,
    @RequestHeader(value = "Authorization", required = false) String authHeader
) {
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        // USER CART: Lade Warenkorb für eingeloggten User
        String token = authHeader.substring(7);
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        return userCartService.getCartByUser(userId, storeId);
    } else {
        // GUEST CART: Erstelle Session-basierten Warenkorb
        String sessionId = generateOrGetSessionId();
        return guestCartService.getCartBySession(sessionId, storeId);
    }
}
```

### 2. Automatische Trennung von User-Carts
- Jeder User hat seinen eigenen Warenkorb (user_id → cart)
- Backend speichert Warenkörbe user-spezifisch in der Datenbank
- Beim Logout wird KEINE Server-Aktion benötigt (JWT wird ungültig)
- Beim Login lädt das Frontend automatisch den User-spezifischen Cart

### 3. Session-Management für Guests
- Guests bekommen eine temporäre Session-ID (Cookie oder localStorage)
- Guest-Carts werden nach 24h automatisch gelöscht (Cron-Job)
- Bei Login kann Guest-Cart optional mit User-Cart gemergt werden

---

## Console-Ausgaben zum Debugging

**Beim Logout:**
```
🚪 Logout - Bereinige Session und Warenkorb
✅ Logout abgeschlossen - Session und Warenkorb bereinigt
🧹 Bereinige lokalen Warenkorb-Cache
🔄 Warenkorb-Update erkannt - lade neu
🛒 Lade Warenkorb für Store 1
📦 Warenkorb geladen: 0 Items
```

**Beim Login:**
```
✅ Login erfolgreich - Warenkorb wird neu geladen
🧹 Bereinige lokalen Warenkorb-Cache
🔄 Warenkorb-Update erkannt - lade neu
🛒 Lade Warenkorb für Store 1
📦 Warenkorb geladen: 2 Items
```

---

## Zusammenfassung

### Was wurde gefixt?

✅ **Logout bereinigt jetzt:**
- `localStorage` (auth_token, currentUser, cart_session_id)
- AuthService State (currentUserSubject → null)
- Warenkorb-Cache (triggert Update für alle Components)

✅ **Login triggert:**
- Warenkorb-Neuladung (clearLocalCart())
- Alle Components laden ihren Warenkorb neu

✅ **Components reagieren:**
- CartComponent hört auf cartUpdate$
- StorefrontComponent hört auf cartUpdate$
- Warenkorb-Counter wird automatisch aktualisiert

✅ **AppComponent verbindet:**
- AuthService ↔ CartService beim App-Start
- Ermöglicht Kommunikation ohne zirkuläre Abhängigkeit

### Warum ist das wichtig?

🔒 **Sicherheit:** User A sieht nicht den Warenkorb von User B
🔒 **Datenschutz:** Bestellhistorie bleibt privat
✅ **UX:** Kein Verwirrung durch fremde Produkte im Warenkorb
✅ **Korrektheit:** Jeder User sieht NUR seinen eigenen Warenkorb

---

## Nächste Schritte zum Testen

1. **Frontend neu starten:**
   ```bash
   cd storeFrontend
   npm start
   ```

2. **Teste alle 4 Szenarien** (siehe oben)

3. **Prüfe Console-Ausgaben** während Login/Logout

4. **Prüfe localStorage** in DevTools:
   - Vor Logout: `auth_token`, `currentUser` sollten existieren
   - Nach Logout: Beide sollten NICHT mehr existieren

5. **Multi-User Test:**
   - Browser 1: Login als User A → Füge Items hinzu → Logout
   - Browser 1: Login als User B → Prüfe Warenkorb (sollte leer oder B's Items sein)

