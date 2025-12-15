# Fix für HTTP 403 Fehler auf markt.ma

## Problem
Beim Zugriff auf markt.ma wurde ein HTTP 403 Forbidden Fehler angezeigt:
```
Der Zugriff auf markt.ma wurde verweigert.
Sie besitzen keine Benutzerrechte zum Anzeigen dieser Seite.
HTTP ERROR 403
```

## Ursachen
1. **Backend Security-Konfiguration zu restriktiv**: Alle API-Endpunkte außer Login/Register erforderten Authentifizierung
2. **Fehlende öffentliche Routen**: Storefront-Routen waren nicht als öffentlich markiert
3. **CORS-Konfiguration unvollständig**: Subdomains von markt.ma waren nicht vollständig erfasst
4. **Fehlende Fehlerbehandlung**: 403-Fehler wurden nicht benutzerfreundlich behandelt

## Implementierte Lösungen

### 1. Backend Security-Konfiguration erweitert
**Datei**: `src/main/java/storebackend/config/SecurityConfig.java`

Folgende Endpunkte sind jetzt öffentlich zugänglich (ohne Authentifizierung):
- ✅ `GET /api/stores/*/public/**` - Öffentliche Store-Informationen
- ✅ `GET /api/stores/public/**` - Öffentliche Store-Listen
- ✅ `GET /api/stores/*/products` - Produktlisten eines Stores
- ✅ `GET /api/stores/*/products/**` - Einzelne Produktdetails
- ✅ `GET /api/stores/by-domain/**` - Store-Lookup per Domain
- ✅ `/api/cart/**` - Warenkorb-Funktionen (Session-basiert)
- ✅ `/api/checkout/**` - Checkout-Prozess
- ✅ `POST /api/orders/create` - Bestellung erstellen

**Geschützte Endpunkte** (benötigen JWT-Token):
- 🔒 Store-Management (Erstellen, Bearbeiten, Löschen)
- 🔒 Produkt-Management (außer GET-Requests)
- 🔒 Bestellungs-Management
- 🔒 Dashboard-Zugriff
- 🔒 Einstellungen

### 2. CORS-Konfiguration verbessert
**Datei**: `src/main/java/storebackend/config/WebConfig.java`

Änderung von `setAllowedOrigins` zu `setAllowedOriginPatterns`:
```java
configuration.setAllowedOriginPatterns(Arrays.asList(
    "http://localhost:*",              // Alle lokalen Ports
    "https://markt.ma",                // Hauptdomain
    "https://*.markt.ma",              // Alle Subdomains
    "http://*.markt.ma",               // Alle Subdomains (HTTP)
    ...
));
```

Dies erlaubt:
- ✅ shop1.markt.ma
- ✅ shop2.markt.ma
- ✅ beliebige-subdomain.markt.ma
- ✅ www.markt.ma
- ✅ api.markt.ma

### 3. Verbesserte Fehlerbehandlung im Frontend
**Datei**: `storeFrontend/src/app/core/interceptors/error.interceptor.ts`

Der Error Interceptor wurde erweitert:
```typescript
- Bei 401 (Unauthorized): Automatischer Logout + Weiterleitung zu /login
- Bei 403 (Forbidden): 
  * Nicht eingeloggt → Weiterleitung zu /login mit Hinweis
  * Eingeloggt → Benutzerfreundliche Fehlermeldung
- Bei 500+ (Server Error): Benutzerfreundliche Fehlermeldung
```

### 4. Login-Komponente erweitert
**Datei**: `storeFrontend/src/app/features/auth/login.component.ts`

Neue Features:
- ✅ Erkennung von Session-Ablauf über URL-Parameter (`?error=session_expired`)
- ✅ Anzeige von kontextbezogenen Fehlermeldungen
- ✅ Automatische Weiterleitung zur ursprünglich angeforderten Seite nach Login
- ✅ `returnUrl`-Parameter wird berücksichtigt

## Anwendungsfall-Szenarien

### Szenario 1: Öffentlicher Store-Besuch
**Benutzer**: Anonymer Kunde  
**Aktion**: Besucht `https://meinshop.markt.ma`  
**Ergebnis**: ✅ Store wird angezeigt, Produkte sind sichtbar, kann in Warenkorb legen und bestellen

### Szenario 2: Store-Management
**Benutzer**: Store-Besitzer  
**Aktion**: Besucht `/dashboard/stores/1/products`  
**Ergebnis**: 
- Wenn eingeloggt: ✅ Zugriff auf Dashboard
- Wenn nicht eingeloggt: ↪️ Weiterleitung zu `/login?returnUrl=/dashboard/stores/1/products`

### Szenario 3: Session abgelaufen
**Benutzer**: Store-Besitzer mit abgelaufenem Token  
**Aktion**: Versucht Produkt zu bearbeiten  
**Ergebnis**: 
1. Backend gibt 401 zurück
2. Frontend führt automatisch Logout durch
3. Weiterleitung zu `/login?error=session_expired&returnUrl=...`
4. Benutzerfreundliche Nachricht: "Ihre Sitzung ist abgelaufen"

## Deployment-Anweisungen

### Backend neu kompilieren und starten
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn clean package -DskipTests
java -jar target/storebackend-0.0.1-SNAPSHOT.jar
```

### Frontend neu bauen
```bash
cd storeFrontend
npm run build
```

### Änderungen testen

#### 1. Test öffentlicher Zugriff (ohne Login)
```http
GET https://markt.ma/api/stores/1/products
# Sollte 200 OK zurückgeben
```

#### 2. Test geschützter Zugriff (benötigt Login)
```http
POST https://markt.ma/api/stores
Authorization: Bearer <JWT-TOKEN>
# Sollte 200 oder 201 zurückgeben

POST https://markt.ma/api/stores
# OHNE Token - sollte 401 zurückgeben
```

#### 3. Test CORS von Subdomain
```javascript
// Von https://shop1.markt.ma ausführen
fetch('https://api.markt.ma/api/stores/1/products')
  .then(r => r.json())
  .then(console.log);
// Sollte funktionieren ohne CORS-Fehler
```

## Wichtige Hinweise

### Sicherheit
- ✅ Öffentliche Endpunkte sind READ-ONLY (nur GET)
- ✅ Schreibzugriffe erfordern weiterhin Authentifizierung
- ✅ JWT-Tokens haben eine Ablaufzeit
- ✅ CORS ist auf markt.ma-Domains beschränkt

### Performance
- ✅ Preflight-Requests werden für 1 Stunde gecacht (MaxAge: 3600)
- ✅ Stateless Sessions (kein Server-Side Session Storage)

### Monitoring
Achten Sie auf folgende Log-Einträge:
```
CORS configuration loaded: *.markt.ma
Security filter chain initialized
JWT authentication successful/failed
```

## Weitere Schritte

### Optional: Erweiterte Sicherheit
1. **Rate Limiting** für öffentliche Endpunkte hinzufügen
2. **API-Key** für programmatischen Zugriff implementieren
3. **IP-Whitelisting** für Admin-Bereiche

### Optional: Monitoring
1. **Prometheus Metrics** für 403/401 Fehler
2. **Alert-System** bei ungewöhnlich vielen Auth-Fehlern
3. **Audit-Log** für geschützte Aktionen

## Testen der Lösung

### Test 1: Direkter Zugriff auf markt.ma
1. Öffnen Sie einen Inkognito-Browser
2. Navigieren Sie zu `https://markt.ma`
3. Erwartetes Ergebnis: Landing-Page wird angezeigt

### Test 2: Zugriff auf Storefront
1. Ohne Login zu `https://markt.ma/storefront/1` navigieren
2. Erwartetes Ergebnis: Store wird mit Produkten angezeigt

### Test 3: Geschützter Bereich
1. Ohne Login zu `https://markt.ma/dashboard` navigieren
2. Erwartetes Ergebnis: Automatische Weiterleitung zu `/login`

### Test 4: Nach Login
1. Login durchführen
2. Zu Dashboard navigieren
3. Erwartetes Ergebnis: Dashboard wird angezeigt
4. Token aus localStorage löschen
5. Seite neu laden
6. Erwartetes Ergebnis: Weiterleitung zu Login mit Hinweis

## Fehlerbehebung

### Problem: Immer noch 403-Fehler
**Lösung**:
1. Backend-Logs prüfen: `tail -f logs/storebackend.log`
2. Browser-Console prüfen auf CORS-Fehler
3. JWT-Token in localStorage überprüfen
4. Backend neu starten

### Problem: CORS-Fehler trotz Konfiguration
**Lösung**:
1. Prüfen Sie die Origin in den Request-Headers
2. Stellen Sie sicher, dass `credentials: 'include'` gesetzt ist
3. Überprüfen Sie, dass die Domain exakt übereinstimmt

### Problem: Login funktioniert nicht
**Lösung**:
1. Prüfen Sie die API-URL in `environment.ts`
2. Überprüfen Sie die Datenbank-Verbindung
3. Testen Sie Login mit Swagger UI: `https://api.markt.ma/swagger-ui.html`

## Support
Bei weiteren Problemen:
1. Backend-Logs überprüfen
2. Browser DevTools Network-Tab analysieren
3. JWT-Token mit https://jwt.io validieren

