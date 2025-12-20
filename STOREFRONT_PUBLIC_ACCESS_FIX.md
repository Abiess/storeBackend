# Backend
sudo journalctl -u storebackend -f

# Nginx
sudo tail -f /var/log/nginx/error.log

# Frontend (Browser Console)
console.log('Cart count loaded:', count);
```
# Storefront Public Access Fix - 403 Cart Count Problem

## 🔍 Problem Analyse

### Symptome
- Storefront Landing sollte öffentlich (anonym) zugänglich sein
- Store resolve funktioniert (200 OK)
- Products/Categories funktionieren (200 OK, leere Arrays)
- **Cart count schlägt fehl mit 403 Forbidden**
- App leitet automatisch zu `/login` um (trotz öffentlichem Endpoint)

### Root Causes Identifiziert

#### 1. **HAUPTPROBLEM: `/count` Endpoint existierte nicht**
```
Frontend ruft: GET /api/public/simple-cart/count?storeId=3&sessionId=...
Backend hatte: KEINEN solchen Endpoint!
→ Spring Security gibt 403 für nicht-existierende Routen
```

#### 2. **Error Interceptor zu streng**
```typescript
// Alter Code: Bei 403 IMMER zum Login umleiten wenn nicht authentifiziert
if (error.status === 403 && !this.authService.isAuthenticated()) {
  this.router.navigate(['/login']);  // ❌ Auch für öffentliche Endpoints!
}
```

#### 3. **CartService hatte kein Error Handling**
```typescript
// Alter Code: Observable wirft Fehler direkt
return this.http.get<number>(`${this.cartApiUrl}/count?...`);
// → 403 Fehler crasht die Component
```

---

## ✅ Implementierte Fixes

### Backend Fix 1: `/count` Endpoint hinzugefügt

**Datei:** `SimpleCartController.java`

```java
@GetMapping("/count")
public ResponseEntity<Map<String, Object>> getCartCount(
        @RequestParam(required = false) Long storeId,
        @RequestParam String sessionId) {
    try {
        Cart cart = cartRepository.findBySessionId(sessionId).orElse(null);
        
        if (cart == null) {
            // Keine Session gefunden -> leerer Warenkorb
            return ResponseEntity.ok(Map.of("count", 0));
        }

        // Optional: Store-ID validieren wenn angegeben
        if (storeId != null && !cart.getStore().getId().equals(storeId)) {
            log.warn("StoreId mismatch: cart belongs to store {}, requested {}", 
                cart.getStore().getId(), storeId);
            return ResponseEntity.ok(Map.of("count", 0));
        }

        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
        int itemCount = items.stream().mapToInt(CartItem::getQuantity).sum();

        return ResponseEntity.ok(Map.of("count", itemCount));
        
    } catch (Exception e) {
        log.error("Error getting cart count for session {}: {}", sessionId, e.getMessage());
        // Graceful degradation: Gib 0 zurück statt Fehler
        return ResponseEntity.ok(Map.of("count", 0));
    }
}
```

**Key Features:**
- ✅ Öffentlich zugänglich (unter `/api/public/simple-cart/count`)
- ✅ Gibt immer `200 OK` zurück (nie 403/404)
- ✅ Graceful degradation: `{count: 0}` bei fehlender Session
- ✅ Store-ID validierung optional
- ✅ Response Format: `{"count": 3}` nicht direkt `3`

---

### Frontend Fix 1: Error Interceptor verbessert

**Datei:** `error.interceptor.ts`

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const isPublicStorefrontRequest = this.isPublicStorefrontEndpoint(req.url);

        if (error.status === 401) {
          // NUR umleiten wenn es KEIN öffentlicher Request ist
          if (!isPublicStorefrontRequest) {
            this.authService.logout();
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.router.url, error: 'session_expired' }
            });
          }
        } else if (error.status === 403) {
          // Wenn öffentlicher Storefront-Request: NICHT umleiten!
          if (isPublicStorefrontRequest) {
            console.warn('403 auf öffentlichem Endpoint - keine Umleitung');
            return throwError(() => error);  // Fehler an Komponente weitergeben
          }
          
          // Rest der 403-Logik für authentifizierte Bereiche...
        }

        return throwError(() => error);
      })
    );
  }

  private isPublicStorefrontEndpoint(url: string): boolean {
    const publicPatterns = [
      '/api/public/',
      '/api/stores/',
      '/products',
      '/categories',
      '/api/cart/',
      '/api/checkout/',
      'by-domain',
      'resolve?host='
    ];
    return publicPatterns.some(pattern => url.includes(pattern));
  }
}
```

**Key Features:**
- ✅ Prüft ob Request zu öffentlichem Endpoint gehört
- ✅ 401/403 auf öffentlichen Endpoints → KEIN Redirect zu `/login`
- ✅ Fehler wird an Komponente weitergegeben für Fallback-Logik
- ✅ Pattern-basierte Erkennung (flexibel erweiterbar)

---

### Frontend Fix 2: CartService mit Graceful Degradation

**Datei:** `cart.service.ts`

```typescript
getCartItemCount(storeId: number, sessionId: string): Observable<number> {
  if (environment.useMockData) {
    return this.mockService.getCartItemCount(storeId, sessionId);
  }
  
  return this.http.get<{count: number}>(
    `${this.cartApiUrl}/count?storeId=${storeId}&sessionId=${sessionId}`
  ).pipe(
    map(response => response.count),
    catchError(error => {
      console.error('Fehler beim Laden des Warenkorb-Counts:', error);
      console.warn('Fallback: Gebe count=0 zurück');
      // Graceful degradation: Bei jedem Fehler 0 zurückgeben
      return of(0);
    })
  );
}
```

**Key Features:**
- ✅ RxJS `catchError` fängt alle HTTP-Fehler ab
- ✅ Fallback: `of(0)` gibt Observable mit Wert 0 zurück
- ✅ Component sieht immer einen validen Wert (keine Exception)
- ✅ Logging für Debugging behalten

---

## 📋 Expected Behavior Spec (öffentliche Storefront)

### ✅ Store Resolution
```
GET /api/public/store/resolve?host=subdomain.markt.ma
→ 200 OK {"id": 3, "name": "My Store", ...}
```

### ✅ Products & Categories
```
GET /api/stores/3/products
→ 200 OK [{"id": 1, "name": "Product 1"}, ...]

GET /api/stores/3/categories
→ 200 OK [{"id": 1, "name": "Category 1"}, ...]
```

### ✅ Cart Count (NEU)
```
GET /api/public/simple-cart/count?storeId=3&sessionId=abc123
→ 200 OK {"count": 0}  // Für neue Session

→ 200 OK {"count": 3}  // Für existierende Session mit Items
```

### ✅ Kein Login-Redirect
- Storefront Landing bleibt zugänglich
- Produkte können angezeigt werden (auch wenn leer)
- Cart Badge zeigt "0" (nicht Error)
- Erst bei Checkout/Konto-Zugriff → Login erforderlich

---

## 🧪 Debugging Guide

### Chrome Network Tab Checklist

#### 1. **Response Headers prüfen**
```
Status: 403 Forbidden
WWW-Authenticate: Bearer realm="..."
→ Spring Security blockiert

vs.

Status: 403 Forbidden  
cf-ray: xyz123...
→ Cloudflare WAF blockiert
```

#### 2. **Response Body analysieren**
```json
{
  "timestamp": "2025-12-20T...",
  "status": 403,
  "error": "Forbidden",
  "path": "/api/public/simple-cart/count"
}
→ Spring gibt 403 (Endpoint nicht in permitAll() oder nicht existent)

vs.

<html><body>Access Denied by Cloudflare</body></html>
→ Cloudflare WAF blockiert Request
```

### cURL Testing

```bash
# 1. Teste den neuen /count Endpoint
curl -v "https://api.markt.ma/api/public/simple-cart/count?storeId=3&sessionId=test123"

# Erwartung: 200 OK {"count":0}

# 2. Teste ohne storeId (sollte auch funktionieren)
curl -v "https://api.markt.ma/api/public/simple-cart/count?sessionId=test123"

# 3. Teste mit ungültigem sessionId (sollte count=0 geben)
curl -v "https://api.markt.ma/api/public/simple-cart/count?storeId=3&sessionId=invalid"

# 4. Prüfe ob SecurityConfig korrekt ist
curl -v "https://api.markt.ma/api/public/store/resolve?host=test.markt.ma"
# Sollte OHNE Token funktionieren

# 5. Prüfe ob private Endpoints noch geschützt sind
curl -v "https://api.markt.ma/api/me/profile"
# Sollte 401 Unauthorized geben (ohne Token)
```

---

## 🚀 Deployment Steps

### 1. Backend deployen
```bash
cd storeBackend
mvn clean package -DskipTests
# Deploy JAR to VPS
sudo systemctl restart storebackend
```

### 2. Backend-Logs prüfen
```bash
sudo journalctl -u storebackend -f --since "5 minutes ago"

# Erwartete Log-Messages:
# ✅ "Mapped GET /api/public/simple-cart/count"
# ✅ Keine 403-Errors mehr für /count
```

### 3. Frontend bauen & deployen
```bash
cd storeFrontend
npm run build --configuration=production
# Deploy zu Hosting
```

### 4. Live-Test
```javascript
// Browser Console auf https://subdomain.markt.ma
fetch('https://api.markt.ma/api/public/simple-cart/count?storeId=3&sessionId=test123')
  .then(r => r.json())
  .then(data => console.log('Count:', data));

// Erwartung: {count: 0}
```

---

## 🔧 Wenn es immer noch nicht funktioniert

### Checklist

#### 1. **Backend SecurityConfig nochmal prüfen**
```java
.requestMatchers("/api/public/**").permitAll()
```
→ Muss VOR `.anyRequest().authenticated()` stehen!

#### 2. **Nginx/Cloudflare prüfen**
```bash
# Teste direkt gegen Backend (Port 8080)
curl http://localhost:8080/api/public/simple-cart/count?storeId=3&sessionId=test

# Wenn lokal OK, aber über Domain 403:
# → Nginx oder Cloudflare blockiert
```

#### 3. **Cloudflare WAF Rules**
- Gehe zu Cloudflare Dashboard → Security → WAF
- Prüfe ob Rule `/api/public/simple-cart/count` blockiert
- Füge Exception hinzu wenn nötig

#### 4. **CORS Headers prüfen**
```
Access-Control-Allow-Origin: https://subdomain.markt.ma
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

#### 5. **Spring Actuator Health Check**
```bash
curl http://localhost:8080/actuator/health
# Sollte {"status":"UP"} zurückgeben
```

---

## 📊 Status Codes - Best Practices

### Öffentliche Endpoints sollten verwenden:

| Situation | Status Code | Body | Redirect? |
|-----------|-------------|------|-----------|
| Session nicht gefunden | `200 OK` | `{count: 0}` | ❌ Nein |
| Store nicht gefunden | `200 OK` | `{count: 0}` | ❌ Nein |
| Datenbankfehler | `200 OK` | `{count: 0}` | ❌ Nein |
| Ungültige Parameter | `400 Bad Request` | `{error: "..."}` | ❌ Nein |

### Private Endpoints (z.B. `/api/me/profile`):

| Situation | Status Code | Redirect? |
|-----------|-------------|-----------|
| Kein Token | `401 Unauthorized` | ✅ Ja → `/login` |
| Token abgelaufen | `401 Unauthorized` | ✅ Ja → `/login` |
| Berechtigung fehlt | `403 Forbidden` | ❌ Nein, zeige Fehler |

**Regel:** `401` = "Du musst dich anmelden" → Redirect OK  
**Regel:** `403` = "Du bist angemeldet, aber hast keine Berechtigung" → Zeige Fehlermeldung

---

## 🎯 Zusammenfassung

### Was wurde gefixt:

1. ✅ **Backend:** `/count` Endpoint hinzugefügt in `SimpleCartController`
2. ✅ **Frontend:** Error Interceptor erkennt öffentliche Endpoints
3. ✅ **Frontend:** CartService hat Fallback-Logik (`count=0` bei Fehler)
4. ✅ **Frontend:** Keine automatischen Login-Redirects mehr auf Storefront

### Erwartetes Verhalten:

- ✅ Storefront Landing lädt ohne Login
- ✅ Cart Badge zeigt "0" (auch wenn Backend-Problem)
- ✅ Keine nervigen Redirects zu `/login`
- ✅ Produkte/Kategorien können angezeigt werden
- ✅ Erst bei Checkout/Account → Login erforderlich

### Testing:

```bash
# Schnelltest nach Deployment:
curl "https://api.markt.ma/api/public/simple-cart/count?storeId=3&sessionId=test"

# Erwartung: {"count":0}
# Status: 200 OK
```

---

**Fragen?** Prüfe die Logs:
```bash

