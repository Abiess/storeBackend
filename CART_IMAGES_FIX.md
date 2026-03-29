# 🛒 WARENKORB-BILDER FIX - KOMPLETT

## ❌ Problem:
**"Im /cart sehe ich leider nicht mehr den product image, nur ein dummy. Kann das mit image_url hängen oder die variante?"**

## 🔍 Root Cause:

### CartController.java - Zeile 168 & 184 (VORHER):
```java
// FALSCH: imageUrl wurde auf den TITEL gesetzt! ❌
productDto.put("imageUrl", item.getVariant().getProduct().getTitle());
productDto.put("imageUrl", item.getProduct().getTitle());

// Beispiel:
// product.getTitle() = "T-Shirt Premium"
// → imageUrl = "T-Shirt Premium" ❌
// → Browser versucht Bild zu laden: <img src="T-Shirt Premium">
// → 404 Not Found → Dummy-Bild wird angezeigt
```

## ✅ Implementierte Lösung:

### Fix 1: Bild-URL korrekt setzen (ProductMedia + MinIO)
**Datei:** `CartController.java`

```java
// RICHTIG: Hole Bild über ProductMedia Repository + MinIO ✅
private String getProductImageUrl(Product product) {
    List<ProductMedia> mediaList = productMediaRepository
        .findByProductIdOrderBySortOrderAsc(product.getId());
    
    if (mediaList.isEmpty()) {
        return "/assets/placeholder-product.png";
    }
    
    // Priorität: Primary Image > Erstes Bild
    ProductMedia primaryMedia = mediaList.stream()
        .filter(ProductMedia::getIsPrimary)
        .findFirst()
        .orElse(mediaList.get(0));
    
    // Generiere MinIO presigned URL (60 Min gültig)
    return minioService.getPresignedUrl(
        primaryMedia.getMedia().getMinioObjectName(), 
        60
    );
}
```

### Fix 2: Varianten-Bild hat Priorität
**Zeile 170-174:**

```java
// Priorität:
// 1. Varianten-Bild (falls vorhanden)
// 2. Produkt-Primary-Bild (über ProductMedia)
// 3. Placeholder

String imageUrl = item.getVariant().getImageUrl() != null 
    ? item.getVariant().getImageUrl()      // ✅ Varianten-Bild (z.B. rotes T-Shirt)
    : getProductImageUrl(product);          // ✅ Produkt-Bild (Standard-Bild)
```

### Fix 3: Dependencies hinzugefügt
```java
@RestController
@RequestMapping("/api/public/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;           // ✅ NEU
    private final ProductMediaRepository productMediaRepository;  // ✅ NEU
}
```

## 🔄 Daten-Flow (Vorher vs. Nachher):

### VORHER (Dummy-Bilder):
```
Backend buildCartResponse():
├─ item.getVariant().getProduct().getTitle() = "T-Shirt Premium"
├─ productDto.put("imageUrl", "T-Shirt Premium") ❌
└─ Frontend: <img src="T-Shirt Premium"> → 404 → Dummy

JSON Response:
{
  "items": [{
    "variant": {
      "product": {
        "id": 33,
        "name": "T-Shirt Premium",
        "imageUrl": "T-Shirt Premium"  // ❌ Kein gültiges Bild!
      }
    }
  }]
}
```

### NACHHER (Echte Bilder):
```
Backend buildCartResponse():
├─ item.getVariant().getImageUrl() = "https://cdn.markt.ma/red-shirt.jpg" ✅
├─ OR getProductImageUrl(product):
│  ├─ Lade ProductMedia aus DB
│  ├─ Finde Primary-Bild
│  ├─ Generiere MinIO presigned URL
│  └─ Return "https://minio.markt.ma/stores/5/abc123.jpg?X-Amz..." ✅
└─ productDto.put("imageUrl", "https://...") ✅

JSON Response:
{
  "items": [{
    "variant": {
      "product": {
        "id": 33,
        "name": "T-Shirt Premium",
        "imageUrl": "https://minio.markt.ma/stores/5/products/abc123.jpg?X-Amz-Algorithm=..."  // ✅
      }
    }
  }]
}

Frontend: <img src="https://minio.markt.ma/..."> → Bild wird geladen! ✅
```

## 📊 Bild-Priorität im Warenkorb:

| Situation | Verwendetes Bild |
|-----------|------------------|
| **Variante mit eigenem Bild** | `variant.imageUrl` (z.B. "rotes T-Shirt") |
| **Variante ohne eigenes Bild** | `product.primaryImageUrl` (via ProductMedia) |
| **Produkt ohne Varianten** | `product.primaryImageUrl` (via ProductMedia) |
| **Produkt ohne Bilder** | `/assets/placeholder-product.png` |

## 🧪 Testing:

### Test 1: Variante mit eigenem Bild
```
1. Produkt mit Varianten öffnen
2. Variante "Rot / M" mit Bild hochladen
3. "In den Warenkorb" klicken
4. Warenkorb öffnen
5. ✅ Zeigt rotes T-Shirt Bild (nicht Standard-Produktbild)
```

### Test 2: Variante ohne eigenes Bild
```
1. Variante "Blau / L" OHNE Bild
2. "In den Warenkorb" klicken
3. Warenkorb öffnen
4. ✅ Zeigt Produkt-Primary-Bild
```

### Test 3: Produkt ohne Varianten
```
1. Produkt ohne Varianten
2. "In den Warenkorb" klicken
3. Warenkorb öffnen
4. ✅ Zeigt Produkt-Primary-Bild
```

### Test 4: Produkt ohne Bilder
```
1. Produkt ohne hochgeladene Bilder
2. "In den Warenkorb" klicken
3. Warenkorb öffnen
4. ✅ Zeigt Placeholder (nicht "undefined" oder Titel)
```

## 📋 Geänderte Dateien:

| Datei | Änderung |
|-------|----------|
| `CartController.java` | `+2` Dependencies: MinioService, ProductMediaRepository |
| `CartController.java` | Zeile 173: Varianten-Bild > Produkt-Bild |
| `CartController.java` | Zeile 194: Produkt-Bild via getProductImageUrl() |
| `CartController.java` | `+25` Zeilen: getProductImageUrl() Methode |
| `SecurityConfig.java` | `+2` Zeilen: Reviews public access |
| `ProductReviewController.java` | errorOnInvalidType = false |

## 🚀 API-Response (Nachher):

```json
GET /api/public/cart?storeId=5&sessionId=guest-xyz
{
  "id": 123,
  "storeId": 5,
  "items": [
    {
      "id": 1,
      "quantity": 2,
      "price": 19.99,
      "variant": {
        "id": 47,
        "sku": "TSHIRT-RED-M",
        "price": 19.99,
        "stock": 50,
        "product": {
          "id": 33,
          "name": "T-Shirt Premium",
          "description": "Hochwertiges Baumwoll-Shirt",
          "imageUrl": "https://minio.markt.ma/stores/5/products/abc123-red.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=..."
        }
      }
    }
  ],
  "itemCount": 2,
  "subtotal": 39.98
}
```

## 🎨 Frontend-Anzeige:

### Vorher (Dummy):
```
┌────────────────────────────────────┐
│ [?]  T-Shirt Premium               │  ← Graues Dummy-Bild
│      Rot / M                        │
│      2x  19.99 € = 39.98 €         │
└────────────────────────────────────┘
```

### Nachher (Echtes Bild):
```
┌────────────────────────────────────┐
│ [📷]  T-Shirt Premium              │  ← ECHTES Produktbild!
│       Rot / M                       │
│       2x  19.99 € = 39.98 €        │
└────────────────────────────────────┘
```

## 🔧 Technische Details:

### MinIO Presigned URLs:
```
https://minio.markt.ma/stores/5/products/abc123.jpg?
  X-Amz-Algorithm=AWS4-HMAC-SHA256&
  X-Amz-Credential=minioadmin/20260329/us-east-1/s3/aws4_request&
  X-Amz-Date=20260329T190000Z&
  X-Amz-Expires=3600&
  X-Amz-Signature=...

Gültig für: 60 Minuten
```

### ProductMedia-Struktur:
```java
ProductMedia {
  id: 1,
  product: Product { id: 33, title: "T-Shirt" },
  media: Media { 
    id: 5, 
    minioObjectName: "stores/5/products/abc123.jpg" 
  },
  isPrimary: true,
  sortOrder: 0
}
```

## 🚀 Deployment:

```bash
# 1. Commit & Push (bereits erfolgt)
git add src/main/java/storebackend/controller/CartController.java
git add src/main/java/storebackend/config/SecurityConfig.java
git add src/main/java/storebackend/controller/ProductReviewController.java
git commit -m "Fix: Cart zeigt echte Produkt-Bilder (ProductMedia + MinIO + Varianten-Priorität)"
git push origin master

# 2. GitHub Actions deployed automatisch (~3-5 Min)

# 3. Testen
https://markt.ma/cart
→ ✅ Produkte haben jetzt echte Bilder!
```

## ✅ Alle aktuellen Fixes (Zusammenfassung):

### 1. ✅ 403 Forbidden Varianten-Update
- `ProductVariantController.java`: @AuthenticationPrincipal statt getCurrentUser()

### 2. ✅ Warenkorb leeren (kein Alert)
- `cart.component.ts`: confirm() entfernt
- `cart.service.ts`: API-URL korrigiert (/cart statt /simple-cart)

### 3. ✅ Quick View Varianten
- `product-quick-view.component.ts`: getVariantDisplayName() (option1/2/3)
- Varianten-Bilder werden angezeigt
- Stock-Badge "(50 verfügbar)"

### 4. ✅ Varianten-Bilder speichern
- `ProductVariant.java`: mediaUrls Feld
- `ProductVariantService.java`: toDTO() gibt images-Array zurück
- Migration: `add_variant_media_urls.sql`

### 5. ✅ Reviews Public Access
- `SecurityConfig.java`: GET /api/products/*/reviews permitAll()
- `ProductReviewController.java`: errorOnInvalidType = false

### 6. ✅ **Cart-Bilder (AKTUELL)**
- `CartController.java`: getProductImageUrl() über ProductMedia
- Varianten-Bild hat Priorität über Produkt-Bild
- MinIO presigned URLs (60 Min gültig)

---

**Erstellt:** 2026-03-29 21:15  
**Build:** ✅ SUCCESS  
**Commits:** 6 Fixes in 1 Session  
**Status:** ⏳ Bereit für Production-Deployment

