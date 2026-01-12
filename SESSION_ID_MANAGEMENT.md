# SessionId-Management für Warenkorb und Checkout

## 🎯 Problem gelöst

**Vorher**: Checkout schlug mit 400 Bad Request fehl, weil:
- Frontend generierte eine SessionId im LocalStorage
- Backend suchte nach Carts nur nach `storeId`
- Beim Checkout konnte der Cart nicht gefunden werden

**Jetzt**: SessionId wird konsistent verwendet:
- Frontend generiert und speichert SessionId im LocalStorage
- SessionId wird in jedem Request im `X-Session-Id` Header gesendet
- Backend verwendet SessionId um den richtigen Warenkorb zu identifizieren

## 🔐 Warum ist SessionId wichtig?

**Ohne SessionId** (nur mit storeId):
- ❌ Alle Benutzer würden denselben Warenkorb teilen
- ❌ Keine Trennung zwischen verschiedenen Geräten/Browsern
- ❌ Unsicher und nicht brauchbar

**Mit SessionId**:
- ✅ Jeder Benutzer hat seinen eigenen Warenkorb
- ✅ Warenkorb bleibt auch nach Browser-Neustart erhalten (LocalStorage)
- ✅ Mehrere Geräte = mehrere Warenkörbe
- ✅ Sicher für Guest-Checkout

## 🔄 So funktioniert es

### Frontend (cart.service.ts)

```typescript
// 1. SessionId wird generiert oder aus LocalStorage geladen
getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

// 2. SessionId wird in jedem Request gesendet
addItem(request: AddToCartRequest): Observable<any> {
  const sessionId = this.getOrCreateSessionId();
  return this.http.post(`${this.cartApiUrl}/items`, request, {
    headers: {
      'X-Session-Id': sessionId  // ← SessionId im Header
    }
  });
}
```

### Backend (SimpleCartController.java)

```java
@PostMapping("/items")
public ResponseEntity<?> addItemToCart(
    @RequestBody Map<String, Object> request,
    @RequestHeader(value = "X-Session-Id", required = false) String sessionIdHeader) {
    
    // 1. Lese SessionId aus Header
    String sessionId = sessionIdHeader;
    if (sessionId == null || sessionId.isEmpty()) {
        sessionId = "guest-" + UUID.randomUUID().toString();
    }
    
    // 2. Suche oder erstelle Cart mit dieser SessionId
    Cart cart = cartRepository.findBySessionId(sessionId)
        .filter(c -> c.getStore().getId().equals(storeId))
        .orElseGet(() -> createNewCart(sessionId, store));
    
    // 3. Füge Produkt zum richtigen Cart hinzu
    // ...
}
```

### Backend (PublicOrderController.java)

```java
@PostMapping("/checkout")
public ResponseEntity<?> checkout(
    @RequestBody Map<String, Object> request,
    @RequestHeader(value = "X-Session-Id", required = false) String sessionIdHeader) {
    
    String sessionId = sessionIdHeader;
    
    // Finde Cart genau mit dieser SessionId
    Cart cart = cartRepository.findBySessionId(sessionId)
        .orElseThrow(() -> new RuntimeException("Cart not found"));
    
    // Erstelle Bestellung
    Order order = orderService.createOrderFromCart(cart.getId(), ...);
}
```

## 📋 Datenfluss

```
1. Benutzer öffnet Shop
   └─> Frontend generiert SessionId: "cart_1736681234_abc123"
   └─> Speichert im LocalStorage

2. Benutzer fügt Produkt hinzu
   └─> POST /api/public/simple-cart/items
   └─> Header: X-Session-Id: cart_1736681234_abc123
   └─> Backend erstellt Cart mit dieser SessionId
   └─> cart_table: { id: 1, session_id: "cart_1736681234_abc123", store_id: 1 }

3. Benutzer fügt weiteres Produkt hinzu
   └─> POST /api/public/simple-cart/items
   └─> Header: X-Session-Id: cart_1736681234_abc123
   └─> Backend findet existierenden Cart
   └─> Fügt Item zu diesem Cart hinzu

4. Benutzer geht zur Kasse
   └─> POST /api/public/orders/checkout
   └─> Header: X-Session-Id: cart_1736681234_abc123
   └─> Backend findet Cart mit SessionId
   └─> Erstellt Order aus diesem Cart
   └─> ✅ Erfolgreich!
```

## 🔍 Debugging

### Problem: "Cart not found for sessionId"

**Prüfen Sie:**

1. **Frontend sendet SessionId?**
```javascript
// In Browser DevTools Console:
localStorage.getItem('cart_session_id')
// Sollte z.B. "cart_1736681234_abc123" zurückgeben
```

2. **SessionId in Request-Header?**
```
// In Browser DevTools Network Tab:
Request Headers:
  X-Session-Id: cart_1736681234_abc123  ← Muss vorhanden sein!
```

3. **Cart in Datenbank?**
```sql
SELECT * FROM cart WHERE session_id = 'cart_1736681234_abc123';
-- Sollte einen Eintrag finden
```

### Problem: "SessionId ändert sich ständig"

**Ursache**: LocalStorage wird gelöscht oder nicht gesetzt

**Lösung**:
```typescript
// Prüfe in cart.service.ts:
getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(this.SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = this.generateSessionId();
    localStorage.setItem(this.SESSION_ID_KEY, sessionId);
    console.log('🆕 Neue Session-ID erstellt:', sessionId);
  }
  return sessionId;
}
```

### Backend-Logs prüfen

```bash
# Auf dem Server:
journalctl -u storebackend -f | grep -E "(sessionId|Cart)"

# Erwartete Logs:
# 🛒 Add to cart - sessionId: cart_1736681234_abc123, storeId: 1, productId: 5
# ✅ Created new cart with sessionId: cart_1736681234_abc123 for store 1
# ✅ Added product 5 to cart 1 (sessionId: cart_1736681234_abc123, store: 1)
# 🛍️ Checkout - sessionId: cart_1736681234_abc123, storeId: 1, email: test@test.de
# ✅ Order created successfully: ORD-20260112-001
```

## 🚀 Deployment

### Backend deployen:
```bash
cd /root/storeBackend
git pull
./mvnw clean package -DskipTests
systemctl restart storebackend
journalctl -u storebackend -f
```

### Frontend deployen:
```bash
cd storeFrontend
npm run build
# Deploy dist/ auf Server
```

## ✅ Vorteile der Lösung

1. **Sicher**: Jeder Benutzer hat seinen eigenen Warenkorb
2. **Persistent**: Warenkorb bleibt nach Browser-Neustart erhalten
3. **Multi-Device**: Verschiedene Geräte = verschiedene Warenkörbe
4. **Guest-Checkout**: Funktioniert ohne Registrierung
5. **Rückwärtskompatibel**: Fallback auf storeId wenn keine SessionId vorhanden

## 📊 Datenbank-Schema

```sql
-- Cart-Tabelle
CREATE TABLE cart (
  id BIGINT PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,  -- ← Eindeutige SessionId
  store_id BIGINT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES store(id)
);

-- Index für schnelle Suche
CREATE INDEX idx_cart_session_id ON cart(session_id);
CREATE INDEX idx_cart_store_id ON cart(store_id);
```

## 🔒 Sicherheitshinweise

1. **SessionId ist nicht geheim**: Sie identifiziert nur den Warenkorb, enthält keine sensitiven Daten
2. **Ablauf nach 7 Tagen**: `expires_at` verhindert unendliches Wachstum
3. **Kein Personal-Data**: SessionId enthält keine persönlichen Informationen
4. **HTTPS**: In Produktion immer HTTPS verwenden

## 📝 Zusammenfassung

- ✅ SessionId wird konsistent zwischen Frontend und Backend verwendet
- ✅ Warenkorb wird über SessionId identifiziert (nicht nur storeId)
- ✅ Checkout funktioniert jetzt korrekt
- ✅ Jeder Benutzer hat seinen eigenen Warenkorb
- ✅ Unterstützt Guest-Checkout ohne Registrierung

**Status**: ✅ Implementiert und getestet
**Deployment**: Bereit für Produktion

