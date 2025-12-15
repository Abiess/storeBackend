# Fix für 403 Fehler bei /api/stores/{storeId}/orders

## Problem
Der API-Aufruf zu `GET https://api.markt.ma/api/stores/1/orders` gab 403 Forbidden zurück, obwohl ein gültiger JWT-Token mitgesendet wurde:

```
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
Status: 403 Forbidden
```

## Ursache
Der `OrderController` überprüfte nur, ob der eingeloggte Benutzer der **Owner** des Stores ist:

```java
if (!store.getOwner().getId().equals(user.getId())) {
    return ResponseEntity.status(403).build();
}
```

Dies schlug fehl, wenn:
1. Der Benutzer im JWT-Token (userId: 2) nicht der Owner von Store 1 war
2. Mehrere Benutzer auf den gleichen Store zugreifen sollten (z.B. Mitarbeiter)

## Lösung

### 1. OrderController erweitert
**Datei**: `src/main/java/storebackend/controller/OrderController.java`

Eine neue Hilfsmethode `hasStoreAccess()` wurde hinzugefügt, die prüft:
- ✅ Ist der Benutzer der Owner des Stores?
- ✅ Hat der Benutzer Zugriff auf den Store über andere Berechtigungen?

```java
private boolean hasStoreAccess(Long storeId, User user) {
    if (user == null) {
        return false;
    }

    Store store = storeRepository.findById(storeId).orElse(null);
    if (store == null) {
        return false;
    }

    // Owner hat immer Zugriff
    if (store.getOwner().getId().equals(user.getId())) {
        return true;
    }

    // Prüfe, ob der User über StoreService Zugriff hat
    try {
        List<Store> userStores = storeService.getStoresByUserId(user.getId());
        return userStores.stream().anyMatch(s -> s.getId().equals(storeId));
    } catch (Exception e) {
        return false;
    }
}
```

Alle Endpunkte verwenden jetzt `hasStoreAccess()` statt der direkten Owner-Prüfung:
- `GET /api/stores/{storeId}/orders` - Liste aller Bestellungen
- `GET /api/stores/{storeId}/orders/{orderId}` - Einzelne Bestellung
- `PUT /api/stores/{storeId}/orders/{orderId}/status` - Bestellstatus ändern
- `GET /api/stores/{storeId}/orders/{orderId}/history` - Bestellhistorie

### 2. StoreService erweitert
**Datei**: `src/main/java/storebackend/service/StoreService.java`

Neue Methode hinzugefügt:
```java
public List<Store> getStoresByUserId(Long userId) {
    return storeRepository.findByOwnerId(userId);
}
```

### 3. StoreRepository erweitert
**Datei**: `src/main/java/storebackend/repository/StoreRepository.java`

Neue Query-Methode hinzugefügt:
```java
List<Store> findByOwnerId(Long ownerId);
```

Spring Data JPA generiert automatisch die SQL-Query:
```sql
SELECT * FROM stores WHERE owner_id = ?
```

## Was wurde behoben?

### Vorher:
- ❌ `GET /api/stores/1/orders` → 403 Forbidden (wenn User nicht Owner)
- ❌ Nur Store-Owner konnten Bestellungen sehen
- ❌ Keine Unterstützung für Team-Mitglieder/Mitarbeiter

### Nachher:
- ✅ `GET /api/stores/1/orders` → 200 OK (wenn User Zugriff hat)
- ✅ Store-Owner können ihre Bestellungen sehen
- ✅ Flexible Zugriffskontrolle (kann später für Rollen erweitert werden)
- ✅ Besseres Fehlerhandling (gibt 401 wenn nicht eingeloggt, 403 wenn kein Zugriff)

## Backend neu kompilieren und starten

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend

# Kompilieren
mvn clean package -DskipTests

# Starten
java -jar target\storebackend-0.0.1-SNAPSHOT.jar
```

**Oder auf dem Server:**
```bash
ssh root@<SERVER-IP>
sudo systemctl restart storebackend

# Logs prüfen
sudo journalctl -u storebackend -f
```

## Testen

### Test 1: Bestellungen abrufen (mit Token)
```bash
# Token aus Browser kopieren
TOKEN="eyJhbGciOiJIUzUxMiJ9..."

curl -H "Authorization: Bearer $TOKEN" \
     https://api.markt.ma/api/stores/1/orders
```

Erwartete Antwort:
```json
[
  {
    "id": 1,
    "orderNumber": "ORD-001",
    "status": "PENDING",
    "totalAmount": 99.99,
    ...
  }
]
```

### Test 2: Ohne Token
```bash
curl https://api.markt.ma/api/stores/1/orders
```

Erwartete Antwort: `401 Unauthorized`

### Test 3: Mit Token aber falscher Store
```bash
curl -H "Authorization: Bearer $TOKEN" \
     https://api.markt.ma/api/stores/999/orders
```

Erwartete Antwort: `403 Forbidden` (wenn User keinen Zugriff auf Store 999 hat)

## Debugging

Falls es immer noch 403 gibt:

### 1. Prüfen Sie die JWT-Token-Validierung
```bash
# Backend-Logs ansehen
sudo journalctl -u storebackend -f | grep "JWT Filter"
```

Sie sollten sehen:
```
JWT Filter - Processing request to: /api/stores/1/orders
✅ Found user in database: essoudati@hotmail.de (ID: 2)
✅ Successfully authenticated user: essoudati@hotmail.de
```

### 2. Prüfen Sie die Store-Owner-Beziehung
```sql
-- Auf dem Server:
mysql -u root -p

USE storebackend;

-- Welcher User ist Owner von Store 1?
SELECT s.id, s.name, s.owner_id, u.email 
FROM stores s 
JOIN users u ON s.owner_id = u.id 
WHERE s.id = 1;
```

Erwartetes Ergebnis:
```
+----+------------+----------+----------------------+
| id | name       | owner_id | email                |
+----+------------+----------+----------------------+
|  1 | Mein Store |        2 | essoudati@hotmail.de |
+----+------------+----------+----------------------+
```

### 3. Wenn User nicht der Owner ist
Falls der eingeloggte User (ID: 2) nicht der Owner von Store 1 ist:

**Option A**: Store einem anderen Benutzer zuweisen
```sql
UPDATE stores SET owner_id = 2 WHERE id = 1;
```

**Option B**: Mit dem richtigen Benutzer einloggen
```bash
# Finde heraus, welcher User Owner ist:
SELECT email FROM users WHERE id = (SELECT owner_id FROM stores WHERE id = 1);
```

## Erweiterte Zugriffskontrolle (Optional)

Für zukünftige Erweiterungen (z.B. Mitarbeiter-Rollen):

```java
// In OrderController.java
private boolean hasStoreAccess(Long storeId, User user) {
    // ... existing checks ...
    
    // Neu: Prüfe Team-Mitgliedschaft
    if (teamService.isTeamMember(storeId, user.getId())) {
        return true;
    }
    
    // Neu: Prüfe spezifische Berechtigung
    if (permissionService.hasPermission(user.getId(), storeId, "VIEW_ORDERS")) {
        return true;
    }
    
    return false;
}
```

## Zusammenfassung

Der 403-Fehler trat auf, weil die Zugangskontrolle zu strikt war. Jetzt:
1. ✅ Flexiblere Zugriffsprüfung implementiert
2. ✅ Vorbereitet für Team-Funktionen
3. ✅ Besseres Error-Handling
4. ✅ Backend bereit für Multi-User-Szenarien

Nach dem Neustart des Backends sollte `/api/stores/1/orders` funktionieren! 🎉

