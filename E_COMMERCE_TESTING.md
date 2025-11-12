# 🧪 E-Commerce Testing Guide

Komplette Test-Anleitung für alle E-Commerce Features von markt.ma.

## 📋 Test-Setup

### 1. Datenbank vorbereiten

```sql
-- PostgreSQL Database erstellen
CREATE DATABASE storedb;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE storedb TO postgres;
```

### 2. Anwendung starten

```bash
mvn clean install
mvn spring-boot:run
```

### 3. Testdaten werden automatisch angelegt

Beim Start werden folgende Daten initialisiert:
- 3 Pläne (FREE, PRO, ENTERPRISE)
- 1 Test-Benutzer mit Store
- Subdomain für den Test-Store
- Beispiel-Kategorien
- Beispiel-Produkte mit Varianten

## 🔐 Test-Accounts

### Admin Account
```
Email: admin@markt.ma
Password: admin123
Role: PLATFORM_ADMIN
```

### Store Owner Account
```
Email: shop@example.com
Password: shop123
Role: STORE_OWNER
Plan: PRO
Store: "Mein Shop" (Slug: meinshop)
Subdomain: meinshop.markt.ma
```

## 📝 Test-Szenarien

### Szenario 1: Vollständiger Product Lifecycle

#### 1.1 Login & Token erhalten

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "shop@example.com",
  "password": "shop123"
}
```

**Erwartete Ausgabe:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "shop@example.com",
    "roles": ["ROLE_STORE_OWNER"]
  }
}
```

**Token speichern für weitere Requests!**

---

#### 1.2 Kategorie erstellen

```http
POST http://localhost:8080/api/stores/1/categories
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Elektronik",
  "slug": "elektronik",
  "description": "Alle elektronischen Geräte",
  "sortOrder": 1
}
```

**Erwartete Ausgabe:**
```json
{
  "id": 5,
  "name": "Elektronik",
  "slug": "elektronik",
  "storeId": 1,
  "parentId": null,
  "sortOrder": 1
}
```

---

#### 1.3 Unterkategorie erstellen

```http
POST http://localhost:8080/api/stores/1/categories
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Smartphones",
  "slug": "smartphones",
  "description": "Alle Smartphones",
  "parentId": 5,
  "sortOrder": 1
}
```

---

#### 1.4 Produkt erstellen

```http
POST http://localhost:8080/api/stores/1/products
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title": "Premium Smartphone X",
  "description": "Neuestes Flaggschiff-Smartphone mit 5G",
  "basePrice": 899.99,
  "status": "DRAFT"
}
```

**Erwartete Ausgabe:**
```json
{
  "id": 10,
  "title": "Premium Smartphone X",
  "basePrice": 899.99,
  "status": "DRAFT",
  "storeId": 1
}
```

---

#### 1.5 Produktoptionen hinzufügen

**Option 1: Farbe**
```http
POST http://localhost:8080/api/stores/1/products/10/options
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Farbe",
  "values": ["Schwarz", "Weiß", "Blau"],
  "sortOrder": 1
}
```

**Option 2: Speicher**
```http
POST http://localhost:8080/api/stores/1/products/10/options
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Speicher",
  "values": ["128GB", "256GB", "512GB"],
  "sortOrder": 2
}
```

**Ergebnis:** 3 Farben × 3 Speicher = 9 mögliche Varianten

---

#### 1.6 Varianten erstellen

**Variante 1: Schwarz, 128GB**
```http
POST http://localhost:8080/api/stores/1/products/10/variants
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "sku": "SMARTPHONE-BLACK-128",
  "price": 899.99,
  "stockQuantity": 50,
  "attributesJson": "{\"color\":\"Schwarz\",\"storage\":\"128GB\"}"
}
```

**Variante 2: Schwarz, 256GB**
```http
POST http://localhost:8080/api/stores/1/products/10/variants
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "sku": "SMARTPHONE-BLACK-256",
  "price": 999.99,
  "stockQuantity": 30,
  "attributesJson": "{\"color\":\"Schwarz\",\"storage\":\"256GB\"}"
}
```

*Weitere 7 Varianten analog erstellen...*

---

#### 1.7 Bild hochladen

**Hinweis:** Du benötigst ein echtes Bild (z.B. `smartphone.jpg`)

```http
POST http://localhost:8080/api/stores/1/media/upload
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data

file: @smartphone.jpg
```

**Erwartete Ausgabe:**
```json
{
  "mediaId": 15,
  "url": "http://localhost:9000/markt-media/stores/1/abc123.jpg",
  "size": 245678,
  "contentType": "image/jpeg"
}
```

---

#### 1.8 Bild mit Produkt verknüpfen

```http
POST http://localhost:8080/api/stores/1/products/10/media
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "mediaId": 15,
  "isPrimary": true,
  "sortOrder": 1
}
```

---

#### 1.9 Produkt aktivieren

```http
PUT http://localhost:8080/api/stores/1/products/10
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

---

### Szenario 2: Shopping Cart & Checkout (Guest)

#### 2.1 Session-ID generieren

```javascript
// Im Browser oder Frontend
const sessionId = 'guest-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
console.log(sessionId); // z.B. "guest-1705234567890-a8b9c0d1e"
```

---

#### 2.2 Produkte zum Warenkorb hinzufügen

```http
POST http://localhost:8080/api/public/cart/items
Content-Type: application/json

{
  "sessionId": "guest-1705234567890-a8b9c0d1e",
  "storeId": 1,
  "variantId": 1,
  "quantity": 2
}
```

**Erwartete Ausgabe:**
```json
{
  "cartItemId": 1,
  "variantId": 1,
  "quantity": 2,
  "priceSnapshot": 899.99,
  "subtotal": 1799.98
}
```

---

#### 2.3 Weiteres Produkt hinzufügen

```http
POST http://localhost:8080/api/public/cart/items
Content-Type: application/json

{
  "sessionId": "guest-1705234567890-a8b9c0d1e",
  "storeId": 1,
  "variantId": 2,
  "quantity": 1
}
```

---

#### 2.4 Warenkorb abrufen

```http
GET http://localhost:8080/api/public/cart?sessionId=guest-1705234567890-a8b9c0d1e
```

**Erwartete Ausgabe:**
```json
{
  "id": 1,
  "sessionId": "guest-1705234567890-a8b9c0d1e",
  "storeId": 1,
  "items": [
    {
      "id": 1,
      "variantId": 1,
      "productTitle": "Premium Smartphone X",
      "variantSku": "SMARTPHONE-BLACK-128",
      "quantity": 2,
      "priceSnapshot": 899.99,
      "subtotal": 1799.98
    },
    {
      "id": 2,
      "variantId": 2,
      "productTitle": "Premium Smartphone X",
      "variantSku": "SMARTPHONE-BLACK-256",
      "quantity": 1,
      "priceSnapshot": 999.99,
      "subtotal": 999.99
    }
  ],
  "itemCount": 3,
  "subtotal": 2799.97,
  "expiresAt": "2025-01-19T10:00:00"
}
```

---

#### 2.5 Menge ändern

```http
PUT http://localhost:8080/api/public/cart/items/1
Content-Type: application/json

{
  "quantity": 3
}
```

---

#### 2.6 Artikel entfernen

```http
DELETE http://localhost:8080/api/public/cart/items/2?sessionId=guest-1705234567890-a8b9c0d1e
```

---

#### 2.7 Checkout durchführen

```http
POST http://localhost:8080/api/public/orders/checkout
Content-Type: application/json

{
  "sessionId": "guest-1705234567890-a8b9c0d1e",
  "storeId": 1,
  "customerEmail": "kunde@example.com",
  "shippingAddress": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "address1": "Musterstraße 123",
    "address2": "Wohnung 4B",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE",
    "phone": "+49 30 12345678"
  },
  "billingAddress": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "address1": "Musterstraße 123",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "notes": "Bitte klingeln bei Müller"
}
```

**Erwartete Ausgabe:**
```json
{
  "orderId": 1,
  "orderNumber": "ORD-1705234567890",
  "status": "PENDING",
  "total": 2867.97,
  "customerEmail": "kunde@example.com",
  "message": "Bestellung erfolgreich erstellt"
}
```

---

#### 2.8 Bestellung nachschlagen

```http
GET http://localhost:8080/api/public/orders/ORD-1705234567890?email=kunde@example.com
```

---

### Szenario 3: Bestellverwaltung (Store Owner)

#### 3.1 Alle Bestellungen abrufen

```http
GET http://localhost:8080/api/stores/1/orders
Authorization: Bearer YOUR_TOKEN_HERE
```

---

#### 3.2 Nur pending Bestellungen

```http
GET http://localhost:8080/api/stores/1/orders?status=PENDING
Authorization: Bearer YOUR_TOKEN_HERE
```

---

#### 3.3 Bestellung bestätigen

```http
PUT http://localhost:8080/api/stores/1/orders/1/status
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "CONFIRMED",
  "note": "Zahlung eingegangen, Bestellung wird bearbeitet"
}
```

---

#### 3.4 Bestellung in Bearbeitung setzen

```http
PUT http://localhost:8080/api/stores/1/orders/1/status
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "PROCESSING",
  "note": "Ware wird kommissioniert"
}
```

---

#### 3.5 Versand markieren

```http
PUT http://localhost:8080/api/stores/1/orders/1/status
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "SHIPPED",
  "note": "Versandt mit DHL, Tracking-Nummer: JJD000123456789"
}
```

---

#### 3.6 Bestellhistorie prüfen

```http
GET http://localhost:8080/api/stores/1/orders/1/history
Authorization: Bearer YOUR_TOKEN_HERE
```

**Erwartete Ausgabe:**
```json
[
  {
    "id": 1,
    "status": "PENDING",
    "note": "Bestellung erstellt",
    "timestamp": "2025-01-12T10:00:00"
  },
  {
    "id": 2,
    "status": "CONFIRMED",
    "note": "Zahlung eingegangen, Bestellung wird bearbeitet",
    "updatedBy": "shop@example.com",
    "timestamp": "2025-01-12T10:15:00"
  },
  {
    "id": 3,
    "status": "PROCESSING",
    "note": "Ware wird kommissioniert",
    "updatedBy": "shop@example.com",
    "timestamp": "2025-01-12T11:00:00"
  },
  {
    "id": 4,
    "status": "SHIPPED",
    "note": "Versandt mit DHL, Tracking-Nummer: JJD000123456789",
    "updatedBy": "shop@example.com",
    "timestamp": "2025-01-12T14:30:00"
  }
]
```

---

### Szenario 4: Inventory Management

#### 4.1 Lagerbestand auffüllen

```http
POST http://localhost:8080/api/stores/1/products/10/variants/1/inventory/adjust
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "quantityChange": 100,
  "reason": "RESTOCK",
  "notes": "Neue Lieferung vom Lieferanten ABC GmbH, Lieferschein Nr. 12345"
}
```

**Erwartete Ausgabe:**
```json
{
  "variantId": 1,
  "oldQuantity": 50,
  "newQuantity": 150,
  "quantityChange": 100,
  "reason": "RESTOCK"
}
```

---

#### 4.2 Beschädigte Ware ausbuchen

```http
POST http://localhost:8080/api/stores/1/products/10/variants/1/inventory/adjust
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "quantityChange": -5,
  "reason": "DAMAGED",
  "notes": "5 Geräte durch Wasserschaden beschädigt"
}
```

---

#### 4.3 Inventory Logs abrufen

```http
GET http://localhost:8080/api/stores/1/products/10/variants/1/inventory/logs
Authorization: Bearer YOUR_TOKEN_HERE
```

**Erwartete Ausgabe:**
```json
[
  {
    "id": 1,
    "variantId": 1,
    "quantityChange": 100,
    "reason": "RESTOCK",
    "notes": "Neue Lieferung vom Lieferanten ABC GmbH",
    "userName": "shop@example.com",
    "timestamp": "2025-01-12T09:00:00"
  },
  {
    "id": 2,
    "variantId": 1,
    "quantityChange": -5,
    "reason": "DAMAGED",
    "notes": "5 Geräte durch Wasserschaden beschädigt",
    "userName": "shop@example.com",
    "timestamp": "2025-01-12T10:00:00"
  },
  {
    "id": 3,
    "variantId": 1,
    "quantityChange": -2,
    "reason": "SALE",
    "notes": "Bestellung ORD-1705234567890",
    "timestamp": "2025-01-12T11:30:00"
  }
]
```

---

#### 4.4 Alle Inventory Logs des Stores

```http
GET http://localhost:8080/api/stores/1/inventory/logs
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔍 Validierungs-Checkliste

### ✅ Kategorien
- [ ] Kategorie erstellen funktioniert
- [ ] Unterkategorie mit Parent erstellen funktioniert
- [ ] Kategorien werden sortiert nach `sortOrder`
- [ ] Root-Kategorien werden korrekt gefiltert
- [ ] Kategorie aktualisieren funktioniert
- [ ] Kategorie löschen funktioniert

### ✅ Produkte
- [ ] Produkt erstellen als DRAFT
- [ ] Produktoptionen hinzufügen
- [ ] Varianten erstellen
- [ ] Produktbilder hochladen und verknüpfen
- [ ] Primary Image setzen
- [ ] Produkt aktivieren (ACTIVE)
- [ ] Produkt aktualisieren
- [ ] Produkt löschen

### ✅ Shopping Cart
- [ ] Guest Cart erstellen mit Session-ID
- [ ] Artikel zum Cart hinzufügen
- [ ] Artikel-Menge ändern
- [ ] Artikel entfernen
- [ ] Cart leeren
- [ ] Price Snapshots werden korrekt gespeichert
- [ ] Cart Expiration funktioniert (7 Tage)

### ✅ Orders
- [ ] Checkout erstellt Bestellung
- [ ] Order Number ist unique
- [ ] Inventory wird automatisch reduziert
- [ ] Status-Änderungen werden geloggt
- [ ] Bestellhistorie zeigt alle Änderungen
- [ ] Guest kann Bestellung mit E-Mail nachschlagen
- [ ] Store Owner sieht alle Bestellungen

### ✅ Inventory
- [ ] Lagerbestand kann erhöht werden (RESTOCK)
- [ ] Lagerbestand kann reduziert werden (DAMAGED, ADJUSTMENT)
- [ ] Inventory Logs werden erstellt
- [ ] Logs zeigen korrekten User
- [ ] Logs sind sortiert nach Timestamp

---

## 🐛 Häufige Fehler & Lösungen

### 401 Unauthorized
**Problem:** Token fehlt oder ist ungültig  
**Lösung:** Login erneut durchführen, neuen Token verwenden

### 403 Forbidden
**Problem:** Keine Berechtigung für diese Ressource  
**Lösung:** Sicherstellen, dass der Store dem eingeloggten User gehört

### 404 Not Found
**Problem:** Ressource existiert nicht  
**Lösung:** ID überprüfen, ggf. vorher GET Request machen

### 409 Conflict
**Problem:** Slug bereits vorhanden  
**Lösung:** Anderen Slug verwenden

### 422 Unprocessable Entity
**Problem:** Validierungsfehler (z.B. Pflichtfelder fehlen)  
**Lösung:** Request Body überprüfen, alle Pflichtfelder ausfüllen

### MinIO Connection Error
**Problem:** MinIO läuft nicht  
**Lösung:** 
```bash
# MinIO starten (Docker)
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

---

## 📊 Performance Tests

### Load Test: 100 gleichzeitige Bestellungen

```bash
# Tool: Apache Bench
ab -n 100 -c 10 -T 'application/json' \
  -p checkout.json \
  http://localhost:8080/api/public/orders/checkout
```

**Erwartung:** < 500ms Response Time für 95% der Requests

---

## 🎯 Next Steps

Nach erfolgreichem Testing:
1. Deployment auf VPS (siehe `VPS_DEPLOYMENT_GUIDE.md`)
2. DNS Setup (siehe `DNS_SETUP_GUIDE.md`)
3. SSL-Zertifikate einrichten
4. Frontend anbinden (Angular/React)
5. Payment Integration (Stripe)

