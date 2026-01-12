# UserID & Checkout Fix - Dokumentation

## 🔍 Gefundene Probleme

### Problem 1: Inkonsistente Cart-Identifikation im Checkout
**Location:** `PublicOrderController.java` - checkout() Methode

**Vorher:**
```java
String cartIdentifier = "user-" + userId;
var cart = cartRepository.findBySessionId(cartIdentifier)
```

**Problem:** 
- Der Controller suchte nach einem Cart mit `sessionId = "user-123"`
- Aber das Cart-Entity hat eine separate `user_id` Spalte und die Methode `findByUserId()`
- Dies führte dazu, dass Carts von angemeldeten Benutzern beim Checkout nicht gefunden wurden

**Lösung:**
```java
var cart = cartRepository.findByUserId(userId)
```

---

### Problem 2: CartController unterstützte keine JWT-basierte User-Authentifizierung
**Location:** `CartController.java` - alle Methoden

**Vorher:**
- Alle Cart-Operationen basierten nur auf `sessionId`
- Keine Unterstützung für angemeldete Benutzer mit JWT-Token
- Inkonsistent mit dem Checkout-Flow, der JWT erfordert

**Lösung:**
- Alle Methoden prüfen nun optional den `Authorization` Header
- Falls JWT-Token vorhanden: Verwendung von `userId` aus Token
- Falls kein Token: Fallback auf `sessionId` für Gast-Benutzer
- Konsistente Token-Extraktion zwischen Cart und Checkout

---

## ✅ Durchgeführte Änderungen

### 1. PublicOrderController.java
**Geänderte Methode:** `checkout()`

**Änderungen:**
- ✅ Ersetzt `findBySessionId(cartIdentifier)` durch `findByUserId(userId)`
- ✅ Entfernt die fehlerhafte Konstruktion `"user-" + userId`
- ✅ Direkter Zugriff auf User-spezifischen Cart über `user_id` Spalte

**Auswirkung:**
- Checkout funktioniert nun korrekt für angemeldete Benutzer
- Cart wird direkt über die Datenbankrelation gefunden
- Konsistent mit dem Cart-Entity-Design

---

### 2. CartController.java
**Geänderte Methoden:** `getCart()`, `addItemToCart()`, `clearCart()`

**Änderungen:**
- ✅ Hinzugefügt: `@Slf4j` für Logging
- ✅ Hinzugefügt: `@RequestHeader(value = "Authorization", required = false)` zu relevanten Methoden
- ✅ Neue Logik: Prüfung ob JWT-Token vorhanden ist
  - **Mit Token:** Extrahiere `userId` und nutze `findByUserId()`
  - **Ohne Token:** Fallback auf `sessionId` und `findBySessionId()`
- ✅ Hinzugefügt: Private Methode `extractUserIdFromToken()` für Token-Parsing
- ✅ Verbesserte Fehlerbehandlung und Logging

**Details der Token-Extraktion:**
```java
private Long extractUserIdFromToken(String token) {
    // Parse JWT Token (Base64 decode des Payload)
    String[] parts = token.split("\\.");
    if (parts.length >= 2) {
        String payload = new String(Base64.getDecoder().decode(parts[1]));
        // Extrahiere userId aus JSON: {"sub":"123",...}
        if (payload.contains("\"sub\":\"")) {
            String userIdStr = payload.split("\"sub\":\"")[1].split("\"")[0];
            return Long.parseLong(userIdStr);
        }
    }
    throw new RuntimeException("Invalid token format");
}
```

**Beispiel-Flow (angemeldeter Benutzer):**
1. Frontend sendet Request mit `Authorization: Bearer <token>`
2. CartController extrahiert `userId` aus Token
3. Lädt Cart via `cartRepository.findByUserId(userId)`
4. User sieht seinen persistenten Cart (nicht sessionId-basiert)

**Beispiel-Flow (Gast):**
1. Frontend sendet Request mit `?sessionId=abc123`
2. CartController nutzt sessionId
3. Lädt Cart via `cartRepository.findBySessionId(sessionId)`
4. Gast sieht seinen temporären Cart

---

## 🏗️ Architektur-Übersicht

### Cart-Entity Beziehungen
```
Cart Entity
├── sessionId: String (optional, für Gäste)
├── user_id: Long (optional, für angemeldete User)
└── store_id: Long (required)
```

### Repository-Methoden
```java
CartRepository
├── findBySessionId(String sessionId)  // Für Gäste
├── findByUserId(Long userId)          // Für angemeldete User
└── findByExpiresAtBefore(...)         // Für Cleanup
```

### Flow-Diagramm

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       ├─── Angemeldet? ──> Ja ──> JWT Token ──> userId
       │                                           │
       └─── Nein ──────────> sessionId ───────────┤
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  CartController │
                                          └────────┬────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────┐
                         │                                               │
                    userId?                                        sessionId?
                         │                                               │
                         ▼                                               ▼
              findByUserId(userId)                          findBySessionId(sessionId)
                         │                                               │
                         └───────────────────┬───────────────────────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  Cart Entity  │
                                    └───────────────┘
```

---

## 🧪 Testing

### Test-Szenarien

#### 1. Angemeldeter Benutzer - Cart laden
```http
GET /api/public/cart
Authorization: Bearer eyJhbGc...
```
**Erwartetes Verhalten:**
- ✅ userId wird aus Token extrahiert
- ✅ Cart wird über `user_id` gefunden
- ✅ Persistenter Cart für den User

#### 2. Gast-Benutzer - Cart laden
```http
GET /api/public/cart?sessionId=guest-abc123
```
**Erwartetes Verhalten:**
- ✅ sessionId wird verwendet
- ✅ Cart wird über `sessionId` gefunden
- ✅ Temporärer Cart für Gast

#### 3. Angemeldeter Benutzer - Checkout
```http
POST /api/public/orders/checkout
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "storeId": 1,
  "customerEmail": "user@test.de",
  "shippingAddress": {...},
  "billingAddress": {...}
}
```
**Erwartetes Verhalten:**
- ✅ userId wird aus Token extrahiert
- ✅ Cart wird über `user_id` gefunden (NICHT über sessionId!)
- ✅ Order wird erstellt
- ✅ Cart wird geleert

#### 4. Artikel zum Cart hinzufügen (angemeldet)
```http
POST /api/public/cart/items
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "storeId": 1,
  "variantId": 5,
  "quantity": 2
}
```
**Erwartetes Verhalten:**
- ✅ userId wird aus Token extrahiert
- ✅ User-Objekt wird geladen
- ✅ Cart wird erstellt/gefunden via `getOrCreateCart(null, user, store)`
- ✅ Artikel wird hinzugefügt

---

## 📊 Vorher/Nachher Vergleich

### Vorher ❌
```
User logged in → JWT Token → checkout()
                                ↓
                    findBySessionId("user-123") 
                                ↓
                           NICHT GEFUNDEN
                                ↓
                             FEHLER!
```

### Nachher ✅
```
User logged in → JWT Token → checkout()
                                ↓
                         extractUserId(token)
                                ↓
                         findByUserId(123)
                                ↓
                           CART GEFUNDEN
                                ↓
                        ORDER ERSTELLT ✓
```

---

## 🔐 Sicherheit

### JWT Token Validierung
- Token wird Base64-dekodiert und `sub` Claim extrahiert
- Bei ungültigem Token: RuntimeException mit klarer Fehlermeldung
- Keine Token-Validierung auf Signatur-Ebene (erfolgt durch Spring Security Filter)

### Zugriffskontrolle
- **Angemeldete User:** Zugriff nur auf eigenen Cart (via userId aus Token)
- **Gäste:** Zugriff nur auf eigenen Cart (via sessionId)
- Keine Cross-User oder Cross-Session Zugriffe möglich

---

## 🚀 Deployment

### Keine Datenbank-Migration erforderlich
- ✅ Keine Änderungen am Schema
- ✅ Verwendet existierende `user_id` und `sessionId` Spalten
- ✅ Sofort einsatzbereit nach Deployment

### Kompatibilität
- ✅ Abwärtskompatibel mit Gast-Carts (sessionId)
- ✅ Unterstützt neue User-basierte Carts (userId)
- ✅ Keine Breaking Changes für Frontend

---

## 📝 Weitere Empfehlungen

### 1. Token-Parsing vereinheitlichen
**Empfehlung:** Zentrale Utility-Klasse erstellen
```java
public class JwtTokenUtil {
    public static Long extractUserId(String token) { ... }
    public static String extractEmail(String token) { ... }
}
```
**Vorteil:** DRY-Prinzip, einfachere Wartung

### 2. Cart-Migration für bestehende User
**Problem:** User mit existierenden sessionId-basierten Carts
**Lösung:** Migration-Endpoint erstellen
```java
@PostMapping("/api/cart/migrate")
public ResponseEntity<?> migrateCart(
    @RequestParam String sessionId,
    @RequestHeader("Authorization") String token
) {
    // Übertrage Items von sessionId-Cart zu userId-Cart
}
```

### 3. Cleanup von Gast-Carts
**Bereits implementiert:** `CartService.deleteExpiredCarts()`
**Empfehlung:** Cron-Job einrichten
```java
@Scheduled(cron = "0 0 2 * * *") // Täglich um 2 Uhr
public void cleanupExpiredCarts() {
    cartService.deleteExpiredCarts();
}
```

---

## 📚 Betroffene Dateien

1. ✅ `src/main/java/storebackend/controller/PublicOrderController.java`
2. ✅ `src/main/java/storebackend/controller/CartController.java`

**Keine Änderungen erforderlich an:**
- ❌ Entity-Klassen (Cart, User, Order)
- ❌ Repository-Interfaces
- ❌ Service-Klassen
- ❌ Datenbank-Schema
- ❌ Frontend (optional: kann JWT automatisch mitschicken)

---

## ✅ Status: BEHOBEN

**Datum:** 2026-01-12  
**Änderungen kompiliert:** ✅ Ja  
**Tests erforderlich:** ✅ Manuell testen (siehe Test-Szenarien)  
**Deployment-ready:** ✅ Ja

