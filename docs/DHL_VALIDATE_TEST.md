# DHL Validate Endpoint - Test Guide

## ✅ Phase 3 abgeschlossen: Validate Endpoint

### Was wurde implementiert:

1. **DhlLabelService.java**
   - `validateShipment(orderId, currentUser)` - Business Logic
   - Order → DHL Request Mapping
   - Store-Owner-Check via DhlSecurityHelper
   - Sandbox Fallback für Shipper-Adresse
   - Default Gewicht/Dimensionen

2. **DhlAdminController.java**
   - `POST /api/admin/orders/{orderId}/dhl/validate`
   - `@PreAuthorize("isAuthenticated()")` - Alle eingeloggten User
   - Store-Owner-Check im Service
   - Error Handling (403, 400, 500)

3. **DhlProperties.java erweitert**
   - Default Gewicht: 1000g
   - Default Dimensionen: 300x200x150mm
   - Sandbox Shipper Address: Bonn, Musterstraße 1

---

## 🧪 Test 1: Validate mit eigenem Store (sollte funktionieren)

### Schritt 1: Backend starten
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn spring-boot:run
```

### Schritt 2: Als Store Owner einloggen
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@hotmail.com\",\"password\":\"maroc2010\"}"
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "demo@hotmail.com"
  }
}
```

→ **JWT Token kopieren!**

### Schritt 3: Order ID finden
```bash
curl -X GET http://localhost:8080/api/me/stores \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

→ Store ID notieren (z.B. `1`)

```bash
curl -X GET http://localhost:8080/api/stores/1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

→ Order ID notieren (z.B. `5`)

### Schritt 4: DHL Shipment validieren
```bash
curl -X POST http://localhost:8080/api/admin/orders/5/dhl/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Erwartetes Ergebnis (SUCCESS):**
```json
{
  "orderId": 5,
  "validation": "SUCCESS",
  "shipmentNo": "00340434161094015902",
  "routingCode": "53 023 5001 123 4",
  "refNo": "MARKTMA-5",
  "validationMessages": [],
  "status": {
    "statusCode": 200,
    "statusText": "ok",
    "sstatus": "success"
  }
}
```

---

## 🧪 Test 2: Validate mit fremdem Store (sollte 403 geben)

### Schritt 1: Als anderer User einloggen
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"other@hotmail.com\",\"password\":\"password123\"}"
```

### Schritt 2: Fremde Order validieren (Order gehört user 1)
```bash
curl -X POST http://localhost:8080/api/admin/orders/5/dhl/validate \
  -H "Authorization: Bearer OTHER_USER_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Erwartetes Ergebnis (ACCESS_DENIED):**
```json
{
  "error": "ACCESS_DENIED",
  "message": "You are not authorized to create DHL labels for this order"
}
```

**HTTP Status:** `403 Forbidden`

---

## 🧪 Test 3: Validate ohne DHL_ENABLED

Falls `DHL_ENABLED=false` in `.env`:

```bash
curl -X POST http://localhost:8080/api/admin/orders/5/dhl/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Erwartetes Ergebnis:**
```json
{
  "error": "DHL integration is disabled",
  "message": "Set DHL_ENABLED=true to activate"
}
```

**HTTP Status:** `400 Bad Request`

---

## 🧪 Test 4: Validate ohne Shipping Address

Falls Order keine Shipping Address hat:

**Erwartetes Ergebnis:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Order has no shipping address: 5"
}
```

**HTTP Status:** `400 Bad Request`

---

## 🔍 Backend Logs prüfen

### Erfolgreiche Validierung:
```
INFO  DhlAdminController - 🔍 Validating DHL shipment for order 5 by user demo@hotmail.com
INFO  DhlLabelService - 🔍 Validating DHL shipment for order 5
INFO  DhlSecurityHelper - ✅ Access granted: User 1 owns store of order 5
INFO  DhlShippingClient - 🔍 Validating DHL shipment for refNo: MARKTMA-5
INFO  DhlShippingClient - ✅ DHL Shipment validation successful for refNo: MARKTMA-5
INFO  DhlLabelService - ✅ DHL validation completed for order 5
INFO  DhlAdminController - ✅ DHL validation successful for order 5
```

### Access Denied:
```
WARN  DhlSecurityHelper - ❌ Access denied: User 2 tried to access order 5 (belongs to user 1)
WARN  DhlAdminController - ❌ Access denied: You are not authorized to create DHL labels for this order
```

---

## 📝 Wichtige Hinweise

### Shipping Address Parsing:
- DHL erwartet **getrennte Felder** für Straße und Hausnummer
- Code parsed automatisch: "Hauptstraße 123" → street="Hauptstraße", house="123"
- Falls Parsing fehlschlägt → house="1" als Fallback

### Shipper Address (Sandbox):
- Verwendet Fallback aus `DhlProperties`:
  - Name: "Test Store"
  - Adresse: Musterstraße 1, 53113 Bonn, DE
- Production: Store-Adresse erforderlich! (TODO: Store Entity erweitern)

### Default Werte:
- Gewicht: 1000g (1kg)
- Dimensionen: 300x200x150mm
- Product: V01PAK (DHL Paket)
- Billing Number: 33333333330102 (Sandbox)

---

## ❌ Bekannte Limitationen (noch nicht implementiert):

1. **Store hat keine Adresse**
   - Sandbox: Verwendet Fallback-Adresse
   - Production: Fehler!
   - TODO: Store Entity um Address-Felder erweitern

2. **Order/Product hat keine Gewicht/Dimensionen**
   - Verwendet Default-Werte aus Properties
   - TODO: Product Entity erweitern

3. **Kein Label erstellen**
   - Nur Validierung, kein echtes Label
   - TODO: Phase 4 (createLabel)

4. **Keine DB-Speicherung**
   - DHL Response wird nicht in Order gespeichert
   - TODO: Phase 5 (Order Entity erweitern)

---

## ✅ Nächste Phase:

**Phase 4: Label Service (Create Label + MinIO)**
- `createLabel(orderId, currentUser)` implementieren
- PDF Label in MinIO speichern
- Order mit DHL-Daten aktualisieren
- Tracking URL generieren

**Phase 5: Order Entity erweitern**
- `dhlShipmentNo`, `dhlRoutingCode`, `dhlLabelUrl` hinzufügen
- `trackingNumber`, `trackingCarrier`, `trackingUrl` befüllen

---

**Stand:** Phase 3 abgeschlossen ✅  
**Kompiliert:** Ja ✅  
**Getestet:** Bereit zum Testen
