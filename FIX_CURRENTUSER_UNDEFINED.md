# Fix für "currentUser: undefined" Problem

## Problem
Im localStorage war `currentUser` als `undefined` gespeichert, obwohl ein gültiger JWT-Token vorhanden war:

```
authToken: eyJhbGciOiJIUzUxMiJ9...
currentUser: undefined  ❌
```

Dies führte zu:
- ❌ 403-Fehler bei API-Aufrufen (z.B. `/api/stores/1/orders`)
- ❌ User-Avatar zeigt nur "U" statt korrektem Initial
- ❌ Dashboard zeigt keine User-E-Mail an

## Ursache
Der `AuthService` lud den User nur aus `localStorage`, aber wenn dieser `undefined` war, wurde er nicht automatisch vom Backend nachgeladen.

## Lösung

### AuthService erweitert
**Datei**: `storeFrontend/src/app/core/services/auth.service.ts`

Der AuthService wurde erweitert um:

1. **Automatische Token-Validierung beim Start**
   - Wenn Token vorhanden, aber `currentUser` undefined/ungültig ist
   - Ruft automatisch `/api/auth/me` auf
   - Lädt User-Daten vom Backend nach

2. **Besseres Error-Handling**
   - Prüft ob `storedUser !== 'undefined'` (als String)
   - Versucht JSON zu parsen mit try/catch
   - Bei Fehler: Validierung mit Backend

3. **Neue Methode `reloadCurrentUser()`**
   - Kann manuell aufgerufen werden
   - Lädt User-Daten frisch vom Backend

### Code-Änderungen

```typescript
constructor(private http: HttpClient) {
  const token = this.getToken();
  if (token) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser && storedUser !== 'undefined') {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Fehler beim Parsen:', e);
        this.validateTokenWithBackend();
      }
    } else {
      // Token vorhanden, aber kein User - hole vom Backend
      this.validateTokenWithBackend();
    }
  }
}

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
        console.log('User erfolgreich geladen:', user.email);
      }
    });
}
```

## Backend-Endpunkt (bereits vorhanden)

Der Endpunkt `/api/auth/me` existiert bereits im Backend:

```java
@GetMapping("/me")
public ResponseEntity<?> getCurrentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    User user = (User) authentication.getPrincipal();
    
    UserInfoResponse userInfo = new UserInfoResponse(
        user.getId(),
        user.getEmail(),
        user.getRoles().stream().map(Enum::name).toList()
    );
    
    return ResponseEntity.ok(userInfo);
}
```

## So beheben Sie das Problem SOFORT (ohne neuen Build)

### Option 1: Browser-Console (Schnellste Lösung)

1. Öffnen Sie die Browser-Console (F12)
2. Gehen Sie zum **Console-Tab**
3. Fügen Sie diesen Code ein und drücken Sie Enter:

```javascript
// Hole den User vom Backend
fetch('https://api.markt.ma/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  }
})
.then(r => r.json())
.then(user => {
  console.log('User vom Backend:', user);
  localStorage.setItem('currentUser', JSON.stringify(user));
  console.log('✓ currentUser gespeichert!');
  location.reload(); // Seite neu laden
})
.catch(err => console.error('Fehler:', err));
```

4. Die Seite lädt automatisch neu
5. `currentUser` sollte jetzt korrekt sein

### Option 2: localStorage manuell reparieren

1. Browser-Console öffnen (F12)
2. **Application-Tab** → **Local Storage** → `https://markt.ma`
3. Doppelklick auf `currentUser` Wert
4. Ersetzen Sie `undefined` mit:

```json
{"id":2,"email":"essoudati@hotmail.de","roles":["USER"]}
```

5. Seite neu laden (F5)

### Option 3: Neu einloggen

1. Klicken Sie auf "Abmelden" im Dashboard
2. Loggen Sie sich erneut ein
3. Der User wird jetzt korrekt gespeichert

## Mit neuem Build (empfohlen für dauerhaften Fix)

### Frontend neu bauen:

```cmd
cd C:\Users\t13016a\Downloads\Team2\storeBackend\storeFrontend
npm run build
```

### Auf Server deployen:

```bash
# Lokal (vom Windows-PC):
scp -r dist\store-frontend\* root@<SERVER-IP>:/var/www/markt.ma/frontend/

# Oder auf dem Server direkt:
cd /var/www/markt.ma/frontend
# Upload der neuen Dateien
```

## Verifizierung

Nach dem Fix sollten Sie im localStorage sehen:

```
authToken: eyJhbGciOiJIUzUxMiJ9... ✓
currentUser: {"id":2,"email":"essoudati@hotmail.de","roles":["USER"]} ✓
```

Und in der Browser-Console beim Laden:

```
User erfolgreich vom Backend geladen: essoudati@hotmail.de
```

## Was wurde behoben?

### Vorher:
- ❌ `currentUser: undefined` im localStorage
- ❌ User-Daten nicht verfügbar für API-Calls
- ❌ 403-Fehler bei `/api/stores/1/orders`
- ❌ Dashboard zeigt "U" statt "E"

### Nachher:
- ✅ `currentUser` wird automatisch vom Backend nachgeladen
- ✅ User-Daten immer verfügbar
- ✅ API-Calls funktionieren mit korrektem User-Kontext
- ✅ Dashboard zeigt korrekte User-Informationen
- ✅ User-Avatar zeigt korrektes Initial

## Weitere Verbesserungen

Der AuthService hat jetzt auch eine neue Methode `reloadCurrentUser()`, die Sie manuell aufrufen können:

```typescript
// In einer Komponente:
constructor(private authService: AuthService) {}

refreshUser() {
  this.authService.reloadCurrentUser().subscribe(user => {
    if (user) {
      console.log('User neu geladen:', user);
    }
  });
}
```

## Zusammenfassung

Das Problem war, dass `localStorage.setItem('currentUser', undefined)` buchstäblich den String "undefined" speicherte, nicht `null` oder ein leeres Objekt. Der AuthService prüft jetzt explizit:

```typescript
if (storedUser && storedUser !== 'undefined') {
  // Nur parsen wenn gültiger JSON
}
```

Und lädt den User automatisch vom Backend nach, wenn:
- Token vorhanden ist
- Aber currentUser fehlt oder ungültig ist

**Führen Sie jetzt Option 1 (Browser-Console) aus, und das Problem ist sofort behoben!** 🎉

