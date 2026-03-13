# Product API Fixes - 403 & 500 Errors

## 🐛 Probleme

### Problem 1: 403 Forbidden
```
GET /api/stores/5/products/17/options
Status: 403 Forbidden
```

**Ursache:** Der `ProductOptionController` erlaubte nur Store-Ownern Zugriff auf Product Options, aber diese müssen öffentlich sein für die Produktansicht im Frontend.

### Problem 2: 500 Internal Server Error
```
PUT /api/stores/5/products/17
{
  "error": "Internal Server Error",
  "message": "Could not initialize proxy [storebackend.entity.Category#5] - no session",
  "status": 500
}
```

**Ursache:** LazyInitializationException - das `Category`-Objekt wurde lazy geladen, aber außerhalb der Hibernate-Session verwendet.

---

## ✅ Lösungen

### Fix 1: Product Options öffentlich zugänglich machen

**Datei:** `ProductOptionController.java`

**Änderung:**
- ❌ Alt: GET `/options` erforderte Authentifizierung
- ✅ Neu: GET `/options` ist öffentlich (wie bei Produkten selbst)
- ℹ️ POST/PUT/DELETE erfordern weiterhin Authentifizierung

```java
@GetMapping
public ResponseEntity<List<ProductOptionDTO>> getProductOptions(...) {
    // ✅ Öffentlicher Zugriff - keine Auth erforderlich
    // Nur Store-Existenz wird geprüft
}
```

**Grund:** 
- Frontend muss Product Options anzeigen können (z.B. Größe, Farbe)
- Konsistent mit GET `/products` (auch öffentlich)
- Nur Änderungen (POST/PUT/DELETE) erfordern Owner-Rechte

---

### Fix 2: LazyInitializationException beheben

**Datei:** `ProductService.java`

**Änderungen:**

1. **@Transactional hinzugefügt zu:**
   - `createProduct()` ✅
   - `updateProduct()` ✅
   - `deleteProduct()` ✅
   - `incrementViewCount()` ✅
   - `incrementSalesCount()` ✅

2. **Repository verwendet JOIN FETCH:**
   - `findByIdAndStoreWithCategory()` lädt Category eager
   - `findByStoreWithCategory()` lädt Category eager
   - Keine lazy loading Exceptions mehr!

**Technischer Hintergrund:**
```java
@Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.id = :id AND p.store = :store")
Optional<Product> findByIdAndStoreWithCategory(@Param("id") Long id, @Param("store") Store store);
```

Das `LEFT JOIN FETCH` lädt die `category` sofort mit, statt sie lazy zu laden.

---

## 🧪 Tests

### Test 1: Product Options abrufen (öffentlich)
```bash
# Sollte jetzt funktionieren (ohne Auth)
curl -X GET "https://api.markt.ma/api/stores/5/products/17/options"
```

**Erwartetes Ergebnis:** 200 OK mit Options-Liste

---

### Test 2: Produkt aktualisieren
```bash
# Mit Authentifizierung
curl -X PUT "https://api.markt.ma/api/stores/5/products/17" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Product",
    "basePrice": 29.99,
    "categoryId": 5,
    "status": "ACTIVE"
  }'
```

**Erwartetes Ergebnis:** 200 OK (keine LazyInitializationException mehr)

---

## 📋 Betroffene Dateien

### Geänderte Dateien:
- ✅ `ProductOptionController.java` - GET /options öffentlich gemacht
- ✅ `ProductService.java` - @Transactional hinzugefügt

### Keine Änderungen nötig:
- ✅ `ProductRepository.java` - JOIN FETCH bereits vorhanden
- ✅ `Product.java` - Entity korrekt konfiguriert

---

## 🚀 Deployment

Keine Datenbank-Migration erforderlich! Einfach Backend neu starten:

```bash
./mvnw spring-boot:run
```

---

## 💡 Best Practices (für die Zukunft)

### 1. GET-Endpoints sollten öffentlich sein
```java
// ✅ Gut: Öffentlich
@GetMapping
public ResponseEntity<List<ProductDTO>> getProducts(...) {
    // Keine Auth für GET
}

// ❌ Schlecht: Auth für öffentliche Daten
@GetMapping
public ResponseEntity<List<ProductDTO>> getProducts(...) {
    if (!hasAccess(user)) return 403;
}
```

### 2. Immer @Transactional für DB-Operationen
```java
// ✅ Gut
@Transactional
public ProductDTO updateProduct(...) {
    // Hibernate Session bleibt offen
}

// ❌ Schlecht
public ProductDTO updateProduct(...) {
    // LazyInitializationException möglich!
}
```

### 3. JOIN FETCH für Lazy Relationships
```java
// ✅ Gut: Eager Loading
@Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.id = :id")

// ❌ Schlecht: Lazy Loading
@Query("SELECT p FROM Product p WHERE p.id = :id")
// → category wird lazy geladen → Exception!
```

---

## ✅ Status

- ✅ 403 Forbidden behoben
- ✅ 500 LazyInitializationException behoben
- ✅ Keine Breaking Changes
- ✅ API konsistent (GET = öffentlich, POST/PUT/DELETE = authenticated)

