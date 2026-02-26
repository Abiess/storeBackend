# 🚀 Product Variants Quick Start

## Problem behoben ✅
**Original Error:** `Could not initialize proxy [storebackend.entity.Category#3] - no session`

**Lösung:** Alle `findByIdAndStore()` Aufrufe durch `findByIdAndStoreWithCategory()` ersetzt, um JOIN FETCH zu verwenden.

---

## Varianten System nutzen

### 1️⃣ Backend starten
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn spring-boot:run
```

### 2️⃣ Frontend starten
```bash
cd storeFrontend
npm start
```

### 3️⃣ Admin: Varianten erstellen

1. Login als Store Owner
2. Gehe zu **Produkte** → Produkt bearbeiten
3. Scrolle zu **"🎨 Produktvarianten"** Sektion
4. Klicke **"+ Option hinzufügen"**
5. Definiere Optionen:
   - **Farbe:** Rot, Blau, Grün
   - **Größe:** S, M, L, XL
6. Gib **Basispreis** ein (z.B. 29.99)
7. Gib **Lagerbestand** ein (z.B. 10)
8. Klicke **"⚡ Varianten generieren"**
9. ✅ 12 Varianten werden automatisch erstellt!
10. Passe einzelne Varianten an (SKU, Preis, Bestand)
11. Klicke **"💾 Alle Varianten speichern"**

### 4️⃣ Storefront: Varianten auswählen

1. Öffne Produktseite im Shop
2. Siehst du **Variant Picker:**
   - 🎨 Farben als bunte Kreise
   - 📏 Größen als Buttons
3. Wähle Farbe: **Rot** (Kreis wird ausgewählt)
4. Wähle Größe: **M** (Button wird highlighted)
5. Preis ändert sich: **29.99 €**
6. Stock-Status: **✓ Auf Lager (10)**
7. Klicke **"🛒 In den Warenkorb"**
8. ✅ Produkt mit Variante im Warenkorb!

---

## 🔑 API Endpoints

### Optionen verwalten
```http
GET    /api/stores/{storeId}/products/{productId}/options
POST   /api/stores/{storeId}/products/{productId}/options
PUT    /api/stores/{storeId}/products/{productId}/options/{optionId}
DELETE /api/stores/{storeId}/products/{productId}/options/{optionId}
```

### Varianten verwalten
```http
GET    /api/stores/{storeId}/products/{productId}/variants
POST   /api/stores/{storeId}/products/{productId}/variants
PUT    /api/stores/{storeId}/products/{productId}/variants/{variantId}
DELETE /api/stores/{storeId}/products/{productId}/variants/{variantId}
POST   /api/stores/{storeId}/products/{productId}/variants/generate  ⚡ AUTO-GENERATE
```

### Öffentlich (Storefront)
```http
GET /api/public/stores/{storeId}/products/{productId}  # Mit Varianten
```

---

## 💡 Beispiel: API Call

### Varianten auto-generieren
```json
POST /api/stores/1/products/123/variants/generate

Request:
{
  "productId": 123,
  "basePrice": 29.99,
  "baseStock": 10,
  "options": [
    {
      "name": "Farbe",
      "values": ["Rot", "Blau", "Grün"]
    },
    {
      "name": "Größe",
      "values": ["S", "M", "L", "XL"]
    }
  ]
}

Response: [ ... 12 Varianten ... ]
{
  "id": 1,
  "sku": "PRODUCT-ROT-S-1234",
  "price": 29.99,
  "stockQuantity": 10,
  "attributes": {
    "Farbe": "Rot",
    "Größe": "S"
  }
}
```

---

## ✅ Alles fertig!

- ✅ Backend kompiliert
- ✅ Lazy Loading Fix angewendet
- ✅ Varianten-System vollständig
- ✅ Admin UI vorhanden
- ✅ Storefront Picker vorhanden
- ✅ Cart & Orders unterstützen Varianten

**Jetzt können Sie Produkte mit Varianten wie bei Shopify erstellen! 🎉**

