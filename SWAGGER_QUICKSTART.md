# 🚀 Swagger API Quick-Start Guide

**Komplette Anleitung für alle verfügbaren API Endpoints**

## 📍 Swagger UI öffnen

**Production:** https://api.markt.ma/swagger-ui.html  
**Lokal:** http://localhost:8080/swagger-ui.html

---

## 🔐 1. AUTHENTIFIZIERUNG

### 1.1 Registrieren (kein Token nötig)
**Endpoint:** `POST /api/auth/register`

```json
{
  "email": "deine@email.de",
  "password": "DeinPasswort123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGci...",
  "email": "deine@email.de",
  "userId": 1
}
```

### 1.2 Login (kein Token nötig)
**Endpoint:** `POST /api/auth/login`

```json
{
  "email": "deine@email.de",
  "password": "DeinPasswort123!"
}
```

### 1.3 Token in Swagger setzen
1. **Kopiere den Token** aus der Response
2. Klicke oben rechts auf **"Authorize"** 🔓
3. Füge den Token ein (OHNE "Bearer")
4. Klicke **"Authorize"** → **"Close"**

✅ **Jetzt bist du authentifiziert!**

---

## 🏪 2. STORE MANAGEMENT

### 2.1 Stores auflisten
**Endpoint:** `GET /api/me/stores`  
**Auth:** ✅ Required

Zeigt alle deine Stores.

### 2.2 Store erstellen
**Endpoint:** `POST /api/me/stores`  
**Auth:** ✅ Required

```json
{
  "name": "Mein Shop",
  "slug": "mein-shop"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Mein Shop",
  "slug": "mein-shop",
  "ownerId": 1,
  "status": "ACTIVE",
  "createdAt": "2025-12-10T12:00:00"
}
```

---

## 📦 3. PRODUKTE

**Base Path:** `/api/stores/{storeId}/products`

### 3.1 Alle Produkte eines Stores
**Endpoint:** `GET /api/stores/{storeId}/products`  
**Auth:** ✅ Required

**Beispiel:** `GET /api/stores/1/products`

### 3.2 Produkt erstellen
**Endpoint:** `POST /api/stores/{storeId}/products`  
**Auth:** ✅ Required

```json
{
  "title": "iPhone 15 Pro",
  "description": "Neuestes iPhone mit A17 Chip",
  "basePrice": 1299.99,
  "status": "ACTIVE"
}
```

**Status-Optionen:** `DRAFT`, `ACTIVE`, `ARCHIVED`

### 3.3 Einzelnes Produkt abrufen
**Endpoint:** `GET /api/stores/{storeId}/products/{productId}`  
**Auth:** ✅ Required

**Beispiel:** `GET /api/stores/1/products/5`

### 3.4 Produkt aktualisieren
**Endpoint:** `PUT /api/stores/{storeId}/products/{productId}`  
**Auth:** ✅ Required

```json
{
  "title": "iPhone 15 Pro Max",
  "description": "Aktualisierte Beschreibung",
  "basePrice": 1399.99,
  "status": "ACTIVE"
}
```

### 3.5 Produkt löschen
**Endpoint:** `DELETE /api/stores/{storeId}/products/{productId}`  
**Auth:** ✅ Required

---

## 🏷️ 4. KATEGORIEN

**Base Path:** `/api/stores/{storeId}/categories`

### 4.1 Alle Kategorien
**Endpoint:** `GET /api/stores/{storeId}/categories`  
**Auth:** ❌ Public

### 4.2 Root-Kategorien (Haupt-Kategorien)
**Endpoint:** `GET /api/stores/{storeId}/categories/root`  
**Auth:** ❌ Public

### 4.3 Unterkategorien
**Endpoint:** `GET /api/stores/{storeId}/categories/{categoryId}/subcategories`  
**Auth:** ❌ Public

### 4.4 Kategorie erstellen
**Endpoint:** `POST /api/stores/{storeId}/categories`  
**Auth:** ✅ Required

```json
{
  "name": "Elektronik",
  "description": "Alle elektronischen Geräte"
}
```

**Optional: Eigenen Slug setzen:**
```json
{
  "name": "Elektronik",
  "slug": "elektronik-kategorie",
  "description": "Alle elektronischen Geräte",
  "parentId": null
}
```

**Hinweis:** 
- Der `slug` wird automatisch aus dem `name` generiert, falls nicht angegeben
- Beispiel: "Elektronik & Zubehör" wird zu "elektronik-zubehoer"
- Der `slug` muss eindeutig sein

**Für Unterkategorie:**
```json
{
  "name": "Smartphones",
  "description": "Mobile Telefone",
  "parentId": 1
}
```

---

## 📸 5. MEDIA / BILDER

**Base Path:** `/api/stores/{storeId}/media`

### 5.1 Bild hochladen
**Endpoint:** `POST /api/stores/{storeId}/media/upload`  
**Auth:** ✅ Required  
**Content-Type:** `multipart/form-data`

**Form-Daten:**
- `file`: Bild-Datei (JPEG, PNG, WebP)
- `mediaType`: `PRODUCT_IMAGE` (optional)
- `altText`: Alternativ-Text (optional)

**In Swagger:**
1. Gehe zu `POST /media/upload`
2. Klicke "Try it out"
3. Klicke "Choose File" und wähle ein Bild
4. Klicke "Execute"

**Response:**
```json
{
  "id": 10,
  "fileName": "product-image.jpg",
  "filePath": "/uploads/store-1/product-image.jpg",
  "fileSize": 245678,
  "mimeType": "image/jpeg",
  "url": "https://api.markt.ma/uploads/store-1/product-image.jpg"
}
```

### 5.2 Alle Medien eines Stores
**Endpoint:** `GET /api/stores/{storeId}/media`  
**Auth:** ✅ Required

### 5.3 Bild löschen
**Endpoint:** `DELETE /api/stores/{storeId}/media/{mediaId}`  
**Auth:** ✅ Required

### 5.4 Speicher-Nutzung prüfen
**Endpoint:** `GET /api/stores/{storeId}/media/usage`  
**Auth:** ✅ Required

```json
{
  "storeId": 1,
  "storageUsedMb": 45,
  "storageMaxMb": 100,
  "productCount": 12,
  "productMaxCount": 50,
  "imageCount": 28,
  "imageMaxCount": 100
}
```

---

## 🖼️ 6. PRODUKT-MEDIEN (Bilder zu Produkten zuweisen)

**Base Path:** `/api/stores/{storeId}/products/{productId}/media`

### 6.1 Bild zu Produkt hinzufügen
**Endpoint:** `POST /api/stores/{storeId}/products/{productId}/media`  
**Auth:** ✅ Required

```json
{
  "mediaId": 10,
  "displayOrder": 1
}
```

### 6.2 Bilder eines Produkts abrufen
**Endpoint:** `GET /api/stores/{storeId}/products/{productId}/media`  
**Auth:** ✅ Required

### 6.3 Bild von Produkt entfernen
**Endpoint:** `DELETE /api/stores/{storeId}/products/{productId}/media/{mediaId}`  
**Auth:** ✅ Required

---

## 🎨 7. PRODUKT-OPTIONEN (z.B. Größe, Farbe)

**Base Path:** `/api/stores/{storeId}/products/{productId}/options`

### 7.1 Option erstellen (z.B. "Größe")
**Endpoint:** `POST /api/stores/{storeId}/products/{productId}/options`  
**Auth:** ✅ Required

```json
{
  "name": "Größe",
  "displayOrder": 1,
  "values": ["S", "M", "L", "XL"]
}
```

**Für Farben:**
```json
{
  "name": "Farbe",
  "displayOrder": 2,
  "values": ["Schwarz", "Weiß", "Blau", "Rot"]
}
```

### 7.2 Optionen eines Produkts abrufen
**Endpoint:** `GET /api/stores/{storeId}/products/{productId}/options`  
**Auth:** ✅ Required

### 7.3 Option aktualisieren
**Endpoint:** `PUT /api/stores/{storeId}/products/{productId}/options/{optionId}`  
**Auth:** ✅ Required

### 7.4 Option löschen
**Endpoint:** `DELETE /api/stores/{storeId}/products/{productId}/options/{optionId}`  
**Auth:** ✅ Required

---

## 🌐 8. DOMAINS

**Base Path:** `/api/stores/{storeId}/domains`

### 8.1 Alle Domains eines Stores
**Endpoint:** `GET /api/stores/{storeId}/domains`  
**Auth:** ✅ Required

### 8.2 Subdomain erstellen (z.B. mein-shop.markt.ma)
**Endpoint:** `POST /api/stores/{storeId}/domains/subdomain`  
**Auth:** ✅ Required

```json
{
  "subdomain": "mein-shop"
}
```

**Response:**
```json
{
  "id": 5,
  "host": "mein-shop.markt.ma",
  "type": "SUBDOMAIN",
  "isPrimary": true,
  "isVerified": true
}
```

### 8.3 Custom Domain hinzufügen (z.B. www.meineshop.de)
**Endpoint:** `POST /api/stores/{storeId}/domains/custom`  
**Auth:** ✅ Required

```json
{
  "host": "www.meineshop.de"
}
```

### 8.4 Domain verifizieren
**Endpoint:** `POST /api/stores/{storeId}/domains/{domainId}/verify`  
**Auth:** ✅ Required

### 8.5 Primary Domain setzen
**Endpoint:** `PUT /api/stores/{storeId}/domains/{domainId}/primary`  
**Auth:** ✅ Required

### 8.6 Domain löschen
**Endpoint:** `DELETE /api/stores/{storeId}/domains/{domainId}`  
**Auth:** ✅ Required

---

## 📦 9. BESTELLUNGEN

**Base Path:** `/api/stores/{storeId}/orders`

### 9.1 Alle Bestellungen
**Endpoint:** `GET /api/stores/{storeId}/orders`  
**Auth:** ✅ Required

**Optional Filter:**
- `?status=PENDING` - Nur ausstehende Bestellungen
- `?status=COMPLETED` - Nur abgeschlossene Bestellungen

**Status-Optionen:**
- `PENDING` - Ausstehend
- `PROCESSING` - In Bearbeitung
- `SHIPPED` - Versendet
- `DELIVERED` - Zugestellt
- `CANCELLED` - Storniert
- `REFUNDED` - Erstattet

### 9.2 Einzelne Bestellung
**Endpoint:** `GET /api/stores/{storeId}/orders/{orderId}`  
**Auth:** ✅ Required

### 9.3 Bestellstatus ändern
**Endpoint:** `PUT /api/stores/{storeId}/orders/{orderId}/status`  
**Auth:** ✅ Required

```json
{
  "status": "SHIPPED",
  "notes": "Versandt mit DHL, Tracking: 123456789"
}
```

### 9.4 Bestellhistorie
**Endpoint:** `GET /api/stores/{storeId}/orders/{orderId}/history`  
**Auth:** ✅ Required

Zeigt alle Status-Änderungen einer Bestellung.

---

## 🛒 10. WARENKORB (Public API)

**Base Path:** `/api/public/cart`

### 10.1 Warenkorb abrufen
**Endpoint:** `GET /api/public/cart?sessionId={sessionId}`  
**Auth:** ❌ Public

### 10.2 Artikel zum Warenkorb hinzufügen
**Endpoint:** `POST /api/public/cart/items`  
**Auth:** ❌ Public

```json
{
  "sessionId": "abc123xyz",
  "storeId": 1,
  "variantId": 5,
  "quantity": 2
}
```

### 10.3 Artikel-Menge aktualisieren
**Endpoint:** `PUT /api/public/cart/items/{itemId}`  
**Auth:** ❌ Public

```json
{
  "quantity": 3
}
```

### 10.4 Artikel aus Warenkorb entfernen
**Endpoint:** `DELETE /api/public/cart/items/{itemId}`  
**Auth:** ❌ Public

### 10.5 Warenkorb leeren
**Endpoint:** `DELETE /api/public/cart?sessionId={sessionId}`  
**Auth:** ❌ Public

---

## 🎟️ 11. COUPONS / GUTSCHEINE

**Base Path:** `/api/stores/{storeId}/coupons`

### 11.1 Coupon erstellen
**Endpoint:** `POST /api/stores/{storeId}/coupons`  
**Auth:** ✅ Required

```json
{
  "code": "SUMMER2025",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "minOrderValue": 50,
  "maxUses": 100,
  "validFrom": "2025-06-01T00:00:00",
  "validUntil": "2025-08-31T23:59:59"
}
```

**Discount Types:**
- `PERCENTAGE` - Prozent-Rabatt (z.B. 20%)
- `FIXED_AMOUNT` - Fester Betrag (z.B. 10€)
- `FREE_SHIPPING` - Kostenloser Versand

### 11.2 Alle Coupons
**Endpoint:** `GET /api/stores/{storeId}/coupons`  
**Auth:** ✅ Required

### 11.3 Coupon validieren (Public)
**Endpoint:** `POST /api/public/coupons/validate`  
**Auth:** ❌ Public

```json
{
  "code": "SUMMER2025",
  "storeId": 1,
  "orderValue": 75.50
}
```

**Response:**
```json
{
  "valid": true,
  "discountAmount": 15.10,
  "message": "Coupon erfolgreich angewendet"
}
```

### 11.4 Coupon deaktivieren
**Endpoint:** `PUT /api/stores/{storeId}/coupons/{couponId}/deactivate`  
**Auth:** ✅ Required

---

## 🔍 12. SEO EINSTELLUNGEN

**Base Path:** `/api/stores/{storeId}/seo`

### 12.1 SEO-Einstellungen abrufen
**Endpoint:** `GET /api/stores/{storeId}/seo`  
**Auth:** ✅ Required

### 12.2 SEO-Einstellungen speichern
**Endpoint:** `POST /api/stores/{storeId}/seo`  
**Auth:** ✅ Required

```json
{
  "metaTitle": "Mein Shop - Die besten Produkte",
  "metaDescription": "Entdecken Sie unsere große Auswahl an hochwertigen Produkten",
  "metaKeywords": "shop, online, einkaufen, produkte",
  "ogTitle": "Mein Shop",
  "ogDescription": "Die besten Produkte online kaufen",
  "ogImage": "https://api.markt.ma/uploads/og-image.jpg",
  "twitterCard": "summary_large_image",
  "robots": "index, follow"
}
```

### 12.3 Structured Data (Schema.org)
**Endpoint:** `GET /api/stores/{storeId}/seo/structured-data`  
**Auth:** ❌ Public

Generiert automatisch Schema.org JSON-LD für SEO.

### 12.4 Sitemap generieren
**Endpoint:** `GET /api/stores/{storeId}/seo/sitemap`  
**Auth:** ❌ Public

Generiert XML-Sitemap für Suchmaschinen.

---

## 📊 13. INVENTAR / LAGERBESTAND

**Base Path:** `/api/stores/{storeId}/inventory`

### 13.1 Lagerbestand aller Produkte
**Endpoint:** `GET /api/stores/{storeId}/inventory`  
**Auth:** ✅ Required

### 13.2 Lagerbestand eines Produkts
**Endpoint:** `GET /api/stores/{storeId}/inventory/products/{productId}`  
**Auth:** ✅ Required

### 13.3 Lagerbestand aktualisieren
**Endpoint:** `PUT /api/stores/{storeId}/inventory/variants/{variantId}`  
**Auth:** ✅ Required

```json
{
  "quantity": 50,
  "reason": "Neue Lieferung erhalten"
}
```

### 13.4 Inventar-Historie
**Endpoint:** `GET /api/stores/{storeId}/inventory/variants/{variantId}/history`  
**Auth:** ✅ Required

Zeigt alle Lagerbestand-Änderungen.

---

## 🔄 14. REDIRECTS

**Base Path:** `/api/stores/{storeId}/redirects`

### 14.1 Redirect erstellen
**Endpoint:** `POST /api/stores/{storeId}/redirects`  
**Auth:** ✅ Required

```json
{
  "sourcePath": "/alte-seite",
  "targetPath": "/neue-seite",
  "statusCode": 301,
  "isActive": true
}
```

**Status Codes:**
- `301` - Permanent Redirect
- `302` - Temporary Redirect

### 14.2 Alle Redirects
**Endpoint:** `GET /api/stores/{storeId}/redirects`  
**Auth:** ✅ Required

---

## 🌍 15. PUBLIC STORE API (für Storefront)

**Base Path:** `/api/public/stores/{slug}`

### 15.1 Store-Informationen (Public)
**Endpoint:** `GET /api/public/stores/{slug}`  
**Auth:** ❌ Public

**Beispiel:** `GET /api/public/stores/mein-shop`

### 15.2 Produkte eines Public Stores
**Endpoint:** `GET /api/public/stores/{slug}/products`  
**Auth:** ❌ Public

**Query-Parameter:**
- `?category={categoryId}` - Nach Kategorie filtern
- `?status=ACTIVE` - Nur aktive Produkte
- `?page=0&size=20` - Pagination

### 15.3 Einzelnes Produkt (Public)
**Endpoint:** `GET /api/public/stores/{slug}/products/{productId}`  
**Auth:** ❌ Public

### 15.4 Bestellung erstellen (Public)
**Endpoint:** `POST /api/public/stores/{slug}/orders`  
**Auth:** ❌ Public

```json
{
  "customerEmail": "kunde@email.de",
  "customerName": "Max Mustermann",
  "shippingAddress": {
    "street": "Musterstraße 123",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "Deutschland"
  },
  "items": [
    {
      "variantId": 5,
      "quantity": 2
    }
  ],
  "couponCode": "SUMMER2025"
}
```

---

## 📈 16. ABONNEMENTS / PLÄNE

**Base Path:** `/api/subscriptions`

### 16.1 Verfügbare Pläne
**Endpoint:** `GET /api/subscriptions/plans`  
**Auth:** ❌ Public

```json
[
  {
    "id": 1,
    "name": "FREE",
    "maxStores": 1,
    "maxProducts": 50,
    "maxStorageMb": 100
  },
  {
    "id": 2,
    "name": "PRO",
    "maxStores": 5,
    "maxProducts": 500,
    "maxStorageMb": 1000
  }
]
```

### 16.2 Aktuellen Plan abrufen
**Endpoint:** `GET /api/subscriptions/my-plan`  
**Auth:** ✅ Required

### 16.3 Plan upgraden
**Endpoint:** `POST /api/subscriptions/upgrade`  
**Auth:** ✅ Required

```json
{
  "planId": 2
}
```

---

## 🎯 WORKFLOW: Store Setup komplett durchführen

### Schritt 1: Registrieren & Authentifizieren
```
1. POST /api/auth/register → Token kopieren
2. In Swagger: "Authorize" → Token einfügen
```

### Schritt 2: Store erstellen
```
3. POST /api/me/stores → Store ID merken (z.B. storeId: 1)
```

### Schritt 3: Kategorien erstellen
```
4. POST /api/stores/1/categories
   → Kategorie "Elektronik" erstellen (ID: 1)
   
5. POST /api/stores/1/categories
   → Unterkategorie "Smartphones" mit parentId: 1
```

### Schritt 4: Produkt mit Bild erstellen
```
6. POST /api/stores/1/media/upload
   → Bild hochladen (Media ID: 10)
   
7. POST /api/stores/1/products
   → Produkt "iPhone 15" erstellen (Product ID: 5)
   
8. POST /api/stores/1/products/5/media
   → Bild zum Produkt hinzufügen: {"mediaId": 10, "displayOrder": 1}
```

### Schritt 5: Produkt-Optionen hinzufügen
```
9. POST /api/stores/1/products/5/options
   → Option "Farbe" mit Werten ["Schwarz", "Weiß", "Blau"]
   
10. POST /api/stores/1/products/5/options
    → Option "Speicher" mit Werten ["128GB", "256GB", "512GB"]
```

### Schritt 6: Domain konfigurieren
```
11. POST /api/stores/1/domains/subdomain
    → Subdomain "mein-shop.markt.ma" erstellen
```

### Schritt 7: SEO optimieren
```
12. POST /api/stores/1/seo
    → Meta-Tags, OG-Tags, etc. setzen
```

### Schritt 8: Gutschein erstellen
```
13. POST /api/stores/1/coupons
    → Gutschein "WELCOME10" für 10% Rabatt
```

✅ **Dein Store ist jetzt komplett eingerichtet!**

---

## 🐛 DEBUGGING TIPPS

### 403 Forbidden?
- Token in "Authorize" gesetzt?
- Token noch gültig? (24h Gültigkeit)
- Bist du Owner des Stores?

### 404 Not Found?
- Ist die storeId korrekt?
- Existiert das Produkt/die Kategorie?

### 500 Internal Server Error?
- Logs prüfen: `ssh root@api.markt.ma "sudo journalctl -u storebackend -n 50"`

### Bild-Upload schlägt fehl?
- Datei zu groß? (Max: 10MB)
- Format unterstützt? (JPEG, PNG, WebP)
- Speicherplatz verfügbar? → `/media/usage` prüfen

---

## 📚 WEITERE RESSOURCEN

- **API Documentation:** https://api.markt.ma/v3/api-docs
- **Swagger UI:** https://api.markt.ma/swagger-ui.html
- **Health Check:** https://api.markt.ma/actuator/health

---

## 🎉 FAZIT

Du kannst jetzt:
✅ Stores erstellen und verwalten  
✅ Produkte mit Bildern und Optionen anlegen  
✅ Kategorien strukturieren  
✅ Domains konfigurieren  
✅ Bestellungen verwalten  
✅ Gutscheine erstellen  
✅ SEO optimieren  
✅ Lagerbestände tracken  

**Viel Erfolg mit deinem Store!** 🚀
