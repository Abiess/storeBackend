# Checkout NullPointerException Fix

## 🐛 Problem

```json
{
  "error": "Cannot invoke \"Object.toString()\" because the return value of \"java.util.Map.get(Object)\" is null"
}
```

**Endpoint:** `POST /api/public/orders/checkout`  
**Status:** 400 Bad Request

---

## 🔍 Ursache

Im `PublicOrderController` wurden Adressdaten unsicher aus der Request-Map extrahiert:

```java
// ❌ PROBLEM: Wenn Feld fehlt → map.get() gibt null zurück
shippingAddress.get("firstName"),  // null!
shippingAddress.get("lastName"),   // null!
// ... wird an createOrderFromCart() übergeben
```

**Ablauf:**
1. Frontend sendet Checkout-Request ohne alle Pflichtfelder
2. `shippingAddress.get("firstName")` gibt `null` zurück
3. Irgendwo im Code wird `.toString()` auf `null` aufgerufen
4. → NullPointerException

---

## ✅ Lösung

### 1. Validation hinzugefügt

```java
// Validate required addresses
if (shippingAddress == null) {
    return ResponseEntity.badRequest().body(Map.of(
        "error", "Shipping address is required"
    ));
}
if (billingAddress == null) {
    return ResponseEntity.badRequest().body(Map.of(
        "error", "Billing address is required"
    ));
}
```

### 2. Sichere Map-Extraktion

```java
// ✅ LÖSUNG: getOrDefault() gibt "" statt null zurück
java.util.function.Function<String, String> getFromShipping = 
    key -> shippingAddress.getOrDefault(key, "");
java.util.function.Function<String, String> getFromBilling = 
    key -> billingAddress.getOrDefault(key, "");

// Verwendung
Order order = orderService.createOrderFromCart(
    cart.getId(),
    customerEmail,
    getFromShipping.apply("firstName"),    // "" statt null
    getFromShipping.apply("lastName"),     // "" statt null
    getFromShipping.apply("address1"),
    // ...
);
```

---

## 🎯 Was wurde geändert?

**Datei:** `PublicOrderController.java`

### VORHER (Problem):
```java
// Keine Validation
Map<String, String> shippingAddress = (Map) request.get("shippingAddress");

// Unsichere Extraktion
shippingAddress.get("firstName"),  // Kann null sein!
```

### NACHHER (Gelöst):
```java
// 1. Validation
if (shippingAddress == null) {
    return ResponseEntity.badRequest().body(Map.of("error", "..."));
}

// 2. Sichere Extraktion mit Fallback
getFromShipping.apply("firstName"),  // "" statt null
```

---

## 🧪 Test

### Request-Format (korrekt):

```json
POST /api/public/orders/checkout
{
  "storeId": 1,
  "sessionId": "abc123",
  "customerEmail": "customer@example.com",
  "paymentMethod": "CASH_ON_DELIVERY",
  "deliveryType": "DELIVERY",
  "deliveryMode": "STANDARD",
  "shippingAddress": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "address1": "Hauptstr. 123",
    "address2": "",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "Germany",
    "phone": "+49123456789"
  },
  "billingAddress": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "address1": "Hauptstr. 123",
    "address2": "",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "Germany"
  },
  "notes": "Bitte klingeln"
}
```

### Test-Cases:

#### 1. Fehlende shippingAddress
```json
{
  "storeId": 1,
  "billingAddress": {...}
}
```
**Erwartetes Ergebnis:** 
```json
{
  "error": "Shipping address is required"
}
```

#### 2. Fehlende Felder in Address
```json
{
  "shippingAddress": {
    "firstName": "Max"
    // lastName fehlt
  }
}
```
**Erwartetes Ergebnis:** Order wird erstellt mit `lastName = ""`

#### 3. Vollständige Daten
**Erwartetes Ergebnis:** 
```json
{
  "orderId": 123,
  "orderNumber": "ORD-2026-...",
  "status": "PENDING",
  "message": "Order created successfully"
}
```

---

## 📋 Weitere Validierungen

Die Checkout-API validiert jetzt:

✅ **Required Fields:**
- `storeId` - Store ID
- `customerEmail` - E-Mail des Kunden
- `shippingAddress` - Lieferadresse (Objekt)
- `billingAddress` - Rechnungsadresse (Objekt)
- `deliveryType` - DELIVERY oder PICKUP
- `paymentMethod` - Zahlungsmethode

✅ **Conditional Required:**
- `sessionId` - Erforderlich für Guest-Checkout
- `deliveryMode` - Erforderlich wenn `deliveryType = DELIVERY`
- `phoneVerificationId` - Erforderlich wenn `paymentMethod = CASH_ON_DELIVERY`

✅ **Nullable Fields:**
- `address2` - Optionale Adresszeile 2
- `notes` - Optionale Bestellnotizen
- `Authorization` Header - Optional (Guest vs. Authenticated)

---

## 💡 Best Practices

### ❌ NICHT so:
```java
String firstName = map.get("firstName");  // Kann null sein!
String result = firstName.toString();     // NullPointerException!
```

### ✅ EMPFOHLEN:
```java
// Option 1: getOrDefault
String firstName = map.getOrDefault("firstName", "");

// Option 2: Null-Check
String firstName = map.get("firstName");
if (firstName == null) firstName = "";

// Option 3: Optional
String firstName = Optional.ofNullable(map.get("firstName")).orElse("");
```

---

## 🚀 Deployment

**Keine Datenbank-Migration nötig!**

Einfach Backend neu starten:
```bash
./mvnw spring-boot:run
```

### Testen:
```bash
curl -X POST http://localhost:8080/api/public/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "sessionId": "test123",
    "customerEmail": "test@example.com",
    "paymentMethod": "CASH_ON_DELIVERY",
    "deliveryType": "DELIVERY",
    "deliveryMode": "STANDARD",
    "shippingAddress": {
      "firstName": "Test",
      "lastName": "User",
      "address1": "Test Str. 1",
      "city": "Berlin",
      "postalCode": "10115",
      "country": "Germany",
      "phone": "+49123"
    },
    "billingAddress": {
      "firstName": "Test",
      "lastName": "User",
      "address1": "Test Str. 1",
      "city": "Berlin",
      "postalCode": "10115",
      "country": "Germany"
    }
  }'
```

---

## ✅ Status

- [x] NullPointerException identifiziert
- [x] Validation für addresses hinzugefügt
- [x] Sichere Map-Extraktion implementiert
- [x] Fehlerbehandlung verbessert
- [x] Dokumentation erstellt

**Status: ✅ BEHOBEN**

Der Checkout funktioniert jetzt auch wenn Adressfelder fehlen oder leer sind!

