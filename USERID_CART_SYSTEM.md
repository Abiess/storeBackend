# UserId-basiertes Warenkorb-System

## ✅ Implementiert: Nur UserId - Kein SessionId mehr

**Stand: 2026-01-12**

### 🎯 Neue Strategie

- ✅ **Nur UserId** - Keine SessionId mehr
- ✅ **Login erforderlich** - Alle Warenkorb-Operationen benötigen Authentifizierung
- ✅ **Checkout nur für eingeloggte Benutzer**
- ✅ **Persistent über alle Geräte** - Gleicher Warenkorb auf Handy & PC
- ✅ **90 Tage Ablaufzeit** - Statt 7 Tage bei Guest-Carts

## 🔐 Authentifizierung

### Backend: Authorization Header erforderlich

Alle Warenkorb-Endpunkte benötigen jetzt den `Authorization` Header mit JWT Token:

```http
GET /api/public/simple-cart?storeId=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### UserId-Extraktion aus JWT

Das Backend extrahiert die UserId aus dem JWT Token:

```java
private Long extractUserIdFromToken(String token) {
    // Parse JWT Token (Base64 decode des Payload)
    String[] parts = token.split("\\.");
    String payload = new String(Base64.getDecoder().decode(parts[1]));
    // Extrahiere userId aus JSON: {"sub":"123",...}
    String userIdStr = payload.split("\"sub\":\"")[1].split("\"")[0];
    return Long.parseLong(userIdStr);
}
```

### Cart-Identifier Format

Statt SessionId wird jetzt verwendet:
```java
String cartIdentifier = "user-" + userId;  // z.B. "user-123"
```

Dieser Identifier wird im Feld `session_id` der `cart` Tabelle gespeichert (Feldname bleibt aus Kompatibilitätsgründen).

## 📊 Datenbank-Schema

```sql
-- Cart-Tabelle (unverändert)
CREATE TABLE cart (
  id BIGINT PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,  -- Jetzt: "user-123" statt "cart_xyz"
  store_id BIGINT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  expires_at TIMESTAMP,  -- 90 Tage für User-Carts
  FOREIGN KEY (store_id) REFERENCES store(id)
);
```

## 🔄 API-Endpunkte

### 1. Produkt zum Warenkorb hinzufügen

**Request:**
```http
POST /api/public/simple-cart/items
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "storeId": 1,
  "productId": 5,
  "quantity": 2
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Product added to cart",
  "cartId": 123,
  "userId": 42
}
```

**Response (Not Authenticated - 401):**
```json
{
  "error": "Authentication required. Please login to add items to cart."
}
```

### 2. Warenkorb laden

**Request:**
```http
GET /api/public/simple-cart?storeId=1
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "items": [...],
  "itemCount": 3,
  "subtotal": 49.99,
  "cartId": 123,
  "storeId": 1,
  "sessionId": "user-42"
}
```

### 3. Warenkorb-Count (für Badge)

**Request:**
```http
GET /api/public/simple-cart/count?storeId=1
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "count": 3
}
```

### 4. Checkout

**Request:**
```http
POST /api/public/orders/checkout
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "storeId": 1,
  "customerEmail": "user@example.com",
  "shippingAddress": {...},
  "billingAddress": {...},
  "notes": "Please ring doorbell"
}
```

**Response (Success):**
```json
{
  "orderId": 456,
  "orderNumber": "ORD-20260112-001",
  "status": "PENDING",
  "total": 54.98,
  "customerEmail": "user@example.com",
  "message": "Order created successfully"
}
```

**Response (Not Authenticated - 401):**
```json
{
  "error": "Authentication required for checkout. Please login."
}
```

**Response (Empty Cart - 400):**
```json
{
  "error": "Cart is empty. Please add items before checkout."
}
```

## 🔍 Backend-Logs

```bash
# Erfolgreicher Ablauf:
🛒 Add to cart - userId: 42, storeId: 1, productId: 5
✅ Created new cart for userId: 42 in store 1
✅ Added product 5 to cart 123 (userId: 42, store: 1)

🔍 Loading cart for userId: 42, storeId: 1
✅ Found cart for userId: 42 (cartId: 123)
📦 Found 3 items in cart

🛍️ Checkout - userId: 42, storeId: 1, email: user@example.com
✅ Order created successfully: ORD-20260112-001 for userId: 42
```

## 🚫 Was passiert ohne Login?

### Szenario 1: Nicht eingeloggt versucht Produkt hinzuzufügen

```
POST /api/public/simple-cart/items
(Kein Authorization Header)

❌ Response: 401 Unauthorized
{
  "error": "Authentication required. Please login to add items to cart."
}
```

### Szenario 2: Nicht eingeloggt versucht Checkout

```
POST /api/public/orders/checkout
(Kein Authorization Header)

❌ Response: 401 Unauthorized
{
  "error": "Authentication required for checkout. Please login."
}
```

### Szenario 3: Ungültiger Token

```
POST /api/public/simple-cart/items
Authorization: Bearer INVALID_TOKEN

❌ Response: 401 Unauthorized
{
  "error": "Invalid or expired token. Please login again."
}
```

## 📱 Frontend-Integration (TODO)

Das Frontend muss angepasst werden:

### 1. cart.service.ts ändern

```typescript
// ENTFERNEN: SessionId-Management
// getOrCreateSessionId() - nicht mehr benötigt
// localStorage SessionId - nicht mehr benötigt

// NEU: JWT Token aus AuthService holen
import { AuthService } from './auth.service';

getCart(storeId: number): Observable<Cart> {
  const token = this.authService.getToken();
  if (!token) {
    // Zeige Login-Dialog
    this.router.navigate(['/login']);
    return EMPTY;
  }
  
  return this.http.get<Cart>(`${this.cartApiUrl}?storeId=${storeId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

### 2. Auth-Guard für Cart-Routes

```typescript
const routes: Routes = [
  {
    path: 'cart',
    component: CartComponent,
    canActivate: [AuthGuard]  // ← Login erforderlich
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard]  // ← Login erforderlich
  }
];
```

### 3. Produktseite: Login-Check vor "In den Warenkorb"

```typescript
addToCart(product: Product) {
  if (!this.authService.isLoggedIn()) {
    // Zeige Login-Dialog mit Redirect zurück
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
    return;
  }
  
  this.cartService.addItem({
    storeId: this.storeId,
    productId: product.id,
    quantity: 1
  }).subscribe(
    () => console.log('✅ Produkt hinzugefügt'),
    (error) => {
      if (error.status === 401) {
        // Token abgelaufen - zur Login-Seite
        this.router.navigate(['/login']);
      }
    }
  );
}
```

## 🔄 Migration von SessionId zu UserId

### Für existierende Carts

Wenn es bereits Guest-Carts in der Datenbank gibt:

```sql
-- Alte Guest-Carts anzeigen
SELECT * FROM cart WHERE session_id LIKE 'cart_%' OR session_id LIKE 'guest-%';

-- Diese können gelöscht oder einem User zugeordnet werden bei Login
-- Option 1: Löschen (einfach)
DELETE FROM cart WHERE session_id LIKE 'cart_%' OR session_id LIKE 'guest-%';

-- Option 2: Bei Login zusammenführen (komplexer, im Code implementieren)
-- Wenn User sich einloggt:
-- 1. Suche Guest-Cart (falls vorhanden)
-- 2. Suche User-Cart
-- 3. Merge Items von Guest-Cart in User-Cart
-- 4. Lösche Guest-Cart
```

## ✅ Vorteile des neuen Systems

1. **Sicher**: Jeder User hat garantiert seinen eigenen Warenkorb
2. **Persistent**: Warenkorb bleibt über Geräte hinweg synchronisiert
3. **Einfacher**: Kein SessionId-Management im Frontend nötig
4. **Zuverlässig**: Keine verlorenen Warenkörbe durch gelöschten LocalStorage
5. **Geschäftslogik**: Ermöglicht Abandoned-Cart-Recovery per Email
6. **Analytics**: Bessere Tracking-Möglichkeiten pro User

## ⚠️ Einschränkungen

1. **Kein Guest-Checkout mehr**: Benutzer **müssen** sich registrieren/einloggen
2. **Barrier to Entry**: Höhere Hürde für spontane Käufe
3. **Frontend-Änderungen erforderlich**: cart.service.ts muss angepasst werden

## 🚀 Deployment

### Backend deployen

```bash
ssh root@45.138.75.107
cd /root/storeBackend
git pull
./mvnw clean package -DskipTests
systemctl restart storebackend
journalctl -u storebackend -f
```

### Frontend anpassen und deployen

```bash
cd storeFrontend
# cart.service.ts anpassen (SessionId entfernen, Authorization Header hinzufügen)
# Auth-Guards hinzufügen
# Login-Checks bei "In den Warenkorb"
npm run build
# Deploy auf Server
```

## 🐛 Troubleshooting

### Problem: "Authentication required"

**Lösung**: Benutzer muss eingeloggt sein
- Redirect zur Login-Seite
- Nach Login zurück zur vorherigen Seite

### Problem: "Invalid or expired token"

**Lösung**: Token ist abgelaufen
- Refresh-Token verwenden (falls implementiert)
- Oder: Neu einloggen

### Problem: "Cart not found for user"

**Ursache**: User hat noch keinen Warenkorb
**Lösung**: Backend erstellt automatisch einen neuen Cart beim ersten `addItem`

### Problem: Frontend sendet noch X-Session-Id Header

**Lösung**: cart.service.ts aktualisieren
- `X-Session-Id` Header entfernen
- `Authorization` Header hinzufügen
- SessionId-Management-Code löschen

## 📊 Beispiel-Daten

```sql
-- User 42 hat Warenkorb in Store 1
INSERT INTO cart (id, session_id, store_id, created_at, updated_at, expires_at)
VALUES (123, 'user-42', 1, NOW(), NOW(), NOW() + INTERVAL 90 DAY);

-- User 99 hat Warenkorb in Store 2
INSERT INTO cart (id, session_id, store_id, created_at, updated_at, expires_at)
VALUES (124, 'user-99', 2, NOW(), NOW(), NOW() + INTERVAL 90 DAY);
```

## 📝 Status

- ✅ Backend: Vollständig implementiert
- ⏳ Frontend: Muss noch angepasst werden
- ⏳ Testing: Nach Frontend-Anpassung
- ⏳ Deployment: Nach Testing

**Nächste Schritte:**
1. Frontend cart.service.ts anpassen
2. Auth-Guards hinzufügen  
3. Login-Checks implementieren
4. Testen auf localhost
5. Deployment auf Server

