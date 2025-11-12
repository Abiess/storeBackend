# 2. Kategorie zuordnen
PUT /api/stores/1/products/5
{
  "categoryId": 2
}

# 3. Produktoptionen erstellen
POST /api/stores/1/products/5/options
{
  "name": "Farbe",
  "values": ["Rot", "Blau", "Schwarz", "Weiß"],
  "sortOrder": 1
}

POST /api/stores/1/products/5/options
{
  "name": "Größe",
  "values": ["S", "M", "L", "XL"],
  "sortOrder": 2
}

# 4. Varianten erstellen (für jede Kombination)
POST /api/stores/1/products/5/variants
{
  "sku": "TSHIRT-RED-M",
  "price": 29.99,
  "stockQuantity": 50,
  "attributesJson": "{\"color\":\"Rot\",\"size\":\"M\"}"
}
# ... weitere 15 Varianten

# 5. Produktbilder hochladen
POST /api/stores/1/media/upload
[Upload image1.jpg]
# Response: { "mediaId": 101, ... }

POST /api/stores/1/products/5/media
{
  "mediaId": 101,
  "isPrimary": true,
  "sortOrder": 1
}

# 6. Produkt aktivieren
PUT /api/stores/1/products/5
{
  "status": "ACTIVE"
}
```

### Workflow 2: Kunden-Checkout-Prozess

```bash
# 1. Cart erstellen und Produkte hinzufügen
POST /api/public/cart/items
{
  "sessionId": "guest-xyz789",
  "storeId": 1,
  "variantId": 25,
  "quantity": 2
}

POST /api/public/cart/items
{
  "sessionId": "guest-xyz789",
  "storeId": 1,
  "variantId": 26,
  "quantity": 1
}

# 2. Cart abrufen
GET /api/public/cart?sessionId=guest-xyz789
# Response: { "items": [...], "subtotal": 89.97, ... }

# 3. Checkout
POST /api/public/orders/checkout
{
  "sessionId": "guest-xyz789",
  "storeId": 1,
  "customerEmail": "kunde@example.com",
  "shippingAddress": { ... },
  "billingAddress": { ... }
}
# Response: { "orderNumber": "ORD-1234567890", ... }

# 4. Bestellung nachschlagen (für Kunde)
GET /api/public/orders/ORD-1234567890?email=kunde@example.com
```

### Workflow 3: Bestellabwicklung (Store Owner)

```bash
# 1. Neue Bestellungen abrufen
GET /api/stores/1/orders?status=PENDING

# 2. Bestellung bestätigen
PUT /api/stores/1/orders/1/status
{
  "status": "CONFIRMED",
  "note": "Zahlung eingegangen, wird bearbeitet"
}

# 3. Bestellung in Bearbeitung setzen
PUT /api/stores/1/orders/1/status
{
  "status": "PROCESSING",
  "note": "Ware wird kommissioniert"
}

# 4. Lagerbestand reduzieren (automatisch bei Checkout, manuell möglich)
POST /api/stores/1/products/5/variants/25/inventory/adjust
{
  "quantityChange": -2,
  "reason": "SALE",
  "notes": "Bestellung ORD-1234567890"
}

# 5. Versand markieren
PUT /api/stores/1/orders/1/status
{
  "status": "SHIPPED",
  "note": "Versandt mit DHL, Tracking: 123456789"
}

# 6. Bestellhistorie prüfen
GET /api/stores/1/orders/1/history
```

---

## 🔒 Autorisierung & Permissions

### Store Owner
- Kann nur eigene Stores verwalten
- Voller Zugriff auf alle Produkte, Bestellungen, Kategorien des eigenen Stores
- Kann Inventory anpassen
- Kann Bestellstatus ändern

### Customer (Authenticated)
- Kann eigenen Cart verwalten
- Kann eigene Bestellungen einsehen
- Kann Checkout durchführen

### Guest
- Kann Session-basierten Cart nutzen
- Kann Guest Checkout durchführen
- Kann eigene Bestellung mit E-Mail + Bestellnummer nachschlagen

### Platform Admin
- Voller Zugriff auf alle Stores
- Kann alle Bestellungen einsehen
- Kann Stores suspendieren

---

## 📊 Response Codes

| Code | Bedeutung |
|------|-----------|
| 200 | OK - Erfolgreich |
| 201 | Created - Ressource erstellt |
| 204 | No Content - Erfolgreich gelöscht |
| 400 | Bad Request - Ungültige Anfrage |
| 401 | Unauthorized - Nicht authentifiziert |
| 403 | Forbidden - Keine Berechtigung |
| 404 | Not Found - Ressource nicht gefunden |
| 409 | Conflict - Konflikt (z.B. Slug bereits vorhanden) |
| 422 | Unprocessable Entity - Validierungsfehler |
| 500 | Internal Server Error - Serverfehler |

---

## 💡 Best Practices

### Produkte anlegen
1. Erst Kategorien erstellen
2. Produkt als DRAFT erstellen
3. Optionen hinzufügen
4. Varianten für alle Kombinationen erstellen
5. Bilder hochladen und verknüpfen
6. Lagerbestand setzen
7. Produkt auf ACTIVE setzen

### Warenkorb
- Immer Session-ID für Gäste verwenden
- Price Snapshots werden automatisch erstellt
- Cart läuft nach 7 Tagen ab
- Bei Login: Guest Cart mit User Cart mergen (geplant)

### Bestellungen
- Status-Änderungen werden automatisch geloggt
- Inventory wird beim Checkout automatisch reduziert
- E-Mail-Benachrichtigungen bei Status-Änderungen (geplant)
- Product Snapshots speichern Produktdaten zum Bestellzeitpunkt

### Inventory
- Immer Grund angeben bei Anpassungen
- Logs für Auditierung nutzen
- Low-Stock Alerts konfigurieren (geplant)
- Regelmäßige Inventur durchführen
# 📚 E-Commerce API Documentation

Vollständige API-Dokumentation für alle E-Commerce Features von markt.ma.

## 🏷️ Produkt-Kategorien

### Alle Kategorien eines Stores abrufen

```http
GET /api/stores/{storeId}/categories
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Kleidung",
    "slug": "kleidung",
    "description": "Alle Kleidungsstücke",
    "parentId": null,
    "sortOrder": 1,
    "createdAt": "2025-01-01T10:00:00",
    "updatedAt": "2025-01-01T10:00:00"
  },
  {
    "id": 2,
    "name": "T-Shirts",
    "slug": "t-shirts",
    "parentId": 1,
    "sortOrder": 1
  }
]
```

### Root-Kategorien abrufen (nur Hauptkategorien)

```http
GET /api/stores/{storeId}/categories/root
Authorization: Bearer {token}
```

### Unterkategorien abrufen

```http
GET /api/stores/{storeId}/categories/{categoryId}/subcategories
Authorization: Bearer {token}
```

### Kategorie erstellen

```http
POST /api/stores/{storeId}/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "T-Shirts",
  "slug": "t-shirts",
  "description": "Alle T-Shirts",
  "parentId": 1,
  "sortOrder": 1
}
```

### Kategorie aktualisieren

```http
PUT /api/stores/{storeId}/categories/{categoryId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "T-Shirts & Tops",
  "slug": "t-shirts-tops",
  "description": "Alle T-Shirts und Tops",
  "sortOrder": 2
}
```

### Kategorie löschen

```http
DELETE /api/stores/{storeId}/categories/{categoryId}
Authorization: Bearer {token}
```

---

## 🎨 Produkt-Optionen (Varianten)

### Alle Optionen eines Produkts abrufen

```http
GET /api/stores/{storeId}/products/{productId}/options
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "productId": 5,
    "name": "Farbe",
    "values": ["Rot", "Blau", "Grün", "Schwarz"],
    "sortOrder": 1
  },
  {
    "id": 2,
    "productId": 5,
    "name": "Größe",
    "values": ["S", "M", "L", "XL"],
    "sortOrder": 2
  }
]
```

### Produkt-Option erstellen

```http
POST /api/stores/{storeId}/products/{productId}/options
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Farbe",
  "values": ["Rot", "Blau", "Grün"],
  "sortOrder": 1
}
```

**Use Case:** Ein T-Shirt mit 4 Farben und 4 Größen ergibt 16 mögliche Varianten.

### Produkt-Option aktualisieren

```http
PUT /api/stores/{storeId}/products/{productId}/options/{optionId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Farbe",
  "values": ["Rot", "Blau", "Grün", "Gelb", "Schwarz"],
  "sortOrder": 1
}
```

### Produkt-Option löschen

```http
DELETE /api/stores/{storeId}/products/{productId}/options/{optionId}
Authorization: Bearer {token}
```

---

## 🖼️ Produkt-Galerie (Media)

### Alle Medien eines Produkts abrufen

```http
GET /api/stores/{storeId}/products/{productId}/media
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "productId": 5,
    "mediaId": 123,
    "mediaUrl": "https://cdn.markt.ma/stores/1/products/image1.jpg",
    "isPrimary": true,
    "sortOrder": 1,
    "createdAt": "2025-01-01T10:00:00"
  },
  {
    "id": 2,
    "productId": 5,
    "mediaId": 124,
    "mediaUrl": "https://cdn.markt.ma/stores/1/products/image2.jpg",
    "isPrimary": false,
    "sortOrder": 2
  }
]
```

### Bild zu Produkt hinzufügen

**Schritt 1:** Bild hochladen (siehe Media Management)

```http
POST /api/stores/{storeId}/media/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [image.jpg]
```

**Schritt 2:** Bild mit Produkt verknüpfen

```http
POST /api/stores/{storeId}/products/{productId}/media
Authorization: Bearer {token}
Content-Type: application/json

{
  "mediaId": 123,
  "isPrimary": true,
  "sortOrder": 1
}
```

### Produktbild aktualisieren

```http
PUT /api/stores/{storeId}/products/{productId}/media/{mediaId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "sortOrder": 3,
  "isPrimary": false
}
```

### Bild als Primary setzen

```http
POST /api/stores/{storeId}/products/{productId}/media/{mediaId}/set-primary
Authorization: Bearer {token}
```

### Produktbild entfernen

```http
DELETE /api/stores/{storeId}/products/{productId}/media/{mediaId}
Authorization: Bearer {token}
```

---

## 📦 Inventory Management

### Inventory Logs eines Stores abrufen

```http
GET /api/stores/{storeId}/inventory/logs
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "variantId": 10,
    "productTitle": "Basic T-Shirt",
    "variantSku": "TSHIRT-RED-M",
    "quantityChange": 100,
    "reason": "RESTOCK",
    "notes": "Neue Lieferung vom Lieferanten",
    "userId": 5,
    "userName": "Admin",
    "timestamp": "2025-01-01T10:00:00"
  },
  {
    "id": 2,
    "variantId": 10,
    "quantityChange": -5,
    "reason": "SALE",
    "notes": "Bestellung #ORD-123",
    "timestamp": "2025-01-02T14:30:00"
  }
]
```

### Inventory Logs einer Variante abrufen

```http
GET /api/stores/{storeId}/products/{productId}/variants/{variantId}/inventory/logs
Authorization: Bearer {token}
```

### Lagerbestand anpassen

```http
POST /api/stores/{storeId}/products/{productId}/variants/{variantId}/inventory/adjust
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantityChange": 100,
  "reason": "RESTOCK",
  "notes": "Neue Lieferung vom Lieferanten XYZ"
}
```

**Mögliche Gründe (reason):**
- `RESTOCK` - Nachlieferung
- `SALE` - Verkauf (automatisch bei Bestellung)
- `RETURN` - Rücksendung
- `ADJUSTMENT` - Manuelle Korrektur
- `DAMAGED` - Beschädigte Ware

**Response:**
```json
{
  "variantId": 10,
  "oldQuantity": 50,
  "newQuantity": 150,
  "quantityChange": 100,
  "reason": "RESTOCK"
}
```

---

## 🛒 Shopping Cart

### Guest Cart (Session-basiert)

#### Cart abrufen

```http
GET /api/public/cart?sessionId={sessionId}
```

**Response:**
```json
{
  "id": 1,
  "sessionId": "guest-abc123",
  "storeId": 1,
  "items": [
    {
      "id": 1,
      "variantId": 10,
      "productTitle": "Basic T-Shirt",
      "variantSku": "TSHIRT-RED-M",
      "quantity": 2,
      "priceSnapshot": 19.99,
      "subtotal": 39.98
    }
  ],
  "itemCount": 2,
  "subtotal": 39.98,
  "expiresAt": "2025-01-08T10:00:00"
}
```

#### Artikel zum Cart hinzufügen

```http
POST /api/public/cart/items
Content-Type: application/json

{
  "sessionId": "guest-abc123",
  "storeId": 1,
  "variantId": 10,
  "quantity": 2
}
```

#### Cart Item aktualisieren

```http
PUT /api/public/cart/items/{itemId}
Content-Type: application/json

{
  "quantity": 5
}
```

#### Cart Item entfernen

```http
DELETE /api/public/cart/items/{itemId}?sessionId={sessionId}
```

#### Cart leeren

```http
DELETE /api/public/cart/clear?sessionId={sessionId}
```

### Authenticated Cart (User-basiert)

#### Eigenen Cart abrufen

```http
GET /api/me/cart
Authorization: Bearer {token}
```

#### Artikel hinzufügen

```http
POST /api/me/cart/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "variantId": 10,
  "quantity": 2
}
```

#### Cart Item aktualisieren

```http
PUT /api/me/cart/items/{itemId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 5
}
```

#### Cart leeren

```http
DELETE /api/me/cart/clear
Authorization: Bearer {token}
```

---

## 📋 Order Management

### Store Owner - Bestellungen abrufen

```http
GET /api/stores/{storeId}/orders
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` - Filter nach Status (PENDING, CONFIRMED, etc.)
- `page` - Seitennummer (default: 0)
- `size` - Anzahl pro Seite (default: 20)

**Response:**
```json
{
  "content": [
    {
      "id": 1,
      "orderNumber": "ORD-1234567890",
      "status": "CONFIRMED",
      "customerEmail": "customer@example.com",
      "subtotal": 39.98,
      "tax": 7.60,
      "shipping": 5.00,
      "total": 52.58,
      "itemCount": 2,
      "createdAt": "2025-01-01T10:00:00",
      "updatedAt": "2025-01-01T11:00:00"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "number": 0
}
```

### Bestellung Details abrufen

```http
GET /api/stores/{storeId}/orders/{orderId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "orderNumber": "ORD-1234567890",
  "status": "CONFIRMED",
  "customerEmail": "customer@example.com",
  "items": [
    {
      "id": 1,
      "variantId": 10,
      "productTitle": "Basic T-Shirt",
      "variantSku": "TSHIRT-RED-M",
      "quantity": 2,
      "price": 19.99,
      "subtotal": 39.98
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE",
    "phone": "+49 123 456789"
  },
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "subtotal": 39.98,
  "tax": 7.60,
  "shipping": 5.00,
  "total": 52.58,
  "notes": "Bitte schnell liefern",
  "createdAt": "2025-01-01T10:00:00",
  "updatedAt": "2025-01-01T11:00:00"
}
```

### Bestellstatus aktualisieren

```http
PUT /api/stores/{storeId}/orders/{orderId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "SHIPPED",
  "note": "Versandt mit DHL, Tracking-Nummer: 123456789"
}
```

**Mögliche Status:**
- `PENDING` - Neu eingegangen
- `CONFIRMED` - Bestätigt
- `PROCESSING` - In Bearbeitung
- `SHIPPED` - Versandt
- `DELIVERED` - Zugestellt
- `CANCELLED` - Storniert
- `REFUNDED` - Erstattet

### Bestellhistorie abrufen

```http
GET /api/stores/{storeId}/orders/{orderId}/history
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "orderId": 1,
    "status": "PENDING",
    "note": "Bestellung erstellt",
    "updatedBy": null,
    "timestamp": "2025-01-01T10:00:00"
  },
  {
    "id": 2,
    "status": "CONFIRMED",
    "note": "Bestellung bestätigt",
    "updatedBy": "Admin",
    "timestamp": "2025-01-01T11:00:00"
  },
  {
    "id": 3,
    "status": "SHIPPED",
    "note": "Versandt mit DHL, Tracking: 123456789",
    "updatedBy": "Admin",
    "timestamp": "2025-01-02T09:00:00"
  }
]
```

### Customer - Eigene Bestellungen abrufen

```http
GET /api/me/orders
Authorization: Bearer {token}
```

### Customer - Bestellung Details

```http
GET /api/me/orders/{orderId}
Authorization: Bearer {token}
```

### Guest Checkout

```http
POST /api/public/orders/checkout
Content-Type: application/json

{
  "sessionId": "guest-abc123",
  "storeId": 1,
  "customerEmail": "customer@example.com",
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "address2": "Apt 4B",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE",
    "phone": "+49 123 456789"
  },
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "notes": "Bitte schnell liefern"
}
```

**Response:**
```json
{
  "orderId": 1,
  "orderNumber": "ORD-1234567890",
  "status": "PENDING",
  "total": 52.58,
  "customerEmail": "customer@example.com"
}
```

### Guest - Bestellung nachschlagen

```http
GET /api/public/orders/{orderNumber}?email={email}
```

---

## 🎯 Beispiel-Workflows

### Workflow 1: Komplettes Produkt mit Varianten erstellen

```bash
# 1. Produkt erstellen
POST /api/stores/1/products
{
  "title": "Premium T-Shirt",
  "description": "Hochwertiges Baumwoll-T-Shirt",
  "basePrice": 29.99,
  "status": "DRAFT"
}
# Response: { "id": 5, ... }


