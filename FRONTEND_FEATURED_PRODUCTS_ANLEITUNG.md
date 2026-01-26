# Featured Products im Frontend - Anleitung

Diese Anleitung erklärt, wie Sie im Frontend Produkte als "Featured" (hervorgehoben) markieren können.

## 🎯 Was wurde implementiert?

### 1. **Admin-Produktliste erweitert**
In der Produktverwaltung (`/dashboard/stores/{storeId}/products`) gibt es jetzt eine neue Spalte **"Featured"**.

### 2. **Features pro Produkt:**
- ⭐ **Featured Toggle Button**: Klicken Sie auf den Stern, um ein Produkt als Featured zu markieren
- 🔢 **Order Input**: Wenn ein Produkt Featured ist, können Sie die Sortierreihenfolge festlegen (0-999)
- 🏷️ **Badge**: Featured Products zeigen einen goldenen Stern (⭐) neben dem Namen

## 📋 Schritt-für-Schritt: Produkt als Featured markieren

### Methode 1: In der Produktliste (Empfohlen)

1. **Öffnen Sie die Produktverwaltung:**
   ```
   Dashboard → Stores → [Ihr Store] → Products
   ```

2. **Featured-Spalte finden:**
   - In der Tabelle gibt es jetzt eine Spalte "Featured"

3. **Produkt als Featured markieren:**
   - Klicken Sie auf den leeren Stern (☆) → wird zu einem goldenen Stern (⭐)
   - Das Produkt ist jetzt Featured!

4. **Sortierreihenfolge festlegen (Optional):**
   - Wenn ein Produkt Featured ist, erscheint ein Zahlen-Eingabefeld
   - Geben Sie eine Zahl zwischen 0-999 ein
   - Niedrigere Zahlen erscheinen zuerst (z.B. 1 = erste Position)

5. **Featured Status entfernen:**
   - Klicken Sie erneut auf den goldenen Stern (⭐) → wird wieder leer (☆)

### Methode 2: Programmatisch im Code

Falls Sie Featured Products programmatisch setzen möchten:

```typescript
import { ProductService } from '@app/core/services/product.service';

constructor(private productService: ProductService) {}

// Produkt als Featured setzen
setProductAsFeatured(storeId: number, productId: number) {
  this.productService.setFeatured(storeId, productId, true, 1).subscribe({
    next: (product) => {
      console.log('Produkt ist jetzt Featured:', product);
    },
    error: (error) => {
      console.error('Fehler:', error);
    }
  });
}

// Featured Status entfernen
removeFeatureStatus(storeId: number, productId: number) {
  this.productService.setFeatured(storeId, productId, false).subscribe({
    next: (product) => {
      console.log('Featured Status entfernt:', product);
    }
  });
}
```

## 🎨 Visuelle Hinweise

### In der Produktliste:
- **Stern-Symbol neben dem Namen**: ⭐ zeigt an, dass das Produkt Featured ist
- **Featured-Spalte**: 
  - ☆ = Nicht Featured (leer)
  - ⭐ = Featured (goldener Stern)
  - Eingabefeld = Sortierreihenfolge (nur sichtbar wenn Featured)

### Beispiel einer Zeile:

```
| Bild | Name                  | Kategorie | Preis | Status | Featured     | Aktionen |
|------|-----------------------|-----------|-------|--------|--------------|----------|
| 📷   | Premium Shirt ⭐      | Kleidung  | 49,99 | Aktiv  | ⭐ [1]      | ✏️ 🗑️  |
| 📷   | Basic Shirt           | Kleidung  | 29,99 | Aktiv  | ☆           | ✏️ 🗑️  |
```

## 🚀 Featured Products im Storefront verwenden

### Öffentliche Endpoints verfügbar:

```typescript
// Featured Products laden
getFeaturedProducts(storeId: number): Observable<Product[]>

// Top Seller laden
getTopProducts(storeId: number, limit: number): Observable<Product[]>

// Trending Products laden
getTrendingProducts(storeId: number, limit: number): Observable<Product[]>

// Neue Produkte laden
getNewArrivals(storeId: number, limit: number): Observable<Product[]>
```

### Beispiel-Implementierung für Homepage:

```typescript
import { Component, OnInit } from '@angular/core';
import { ProductService } from '@app/core/services/product.service';
import { Product } from '@app/core/models';

@Component({
  selector: 'app-homepage',
  template: `
    <section class="featured-products">
      <h2>⭐ Unsere Highlights</h2>
      <div class="products-grid">
        <div *ngFor="let product of featuredProducts" class="product-card">
          <img [src]="product.primaryImageUrl" [alt]="product.title">
          <h3>{{ product.title }}</h3>
          <p>{{ product.basePrice }} €</p>
        </div>
      </div>
    </section>

    <section class="top-sellers">
      <h2>🔥 Bestseller</h2>
      <div class="products-grid">
        <div *ngFor="let product of topProducts" class="product-card">
          <img [src]="product.primaryImageUrl" [alt]="product.title">
          <h3>{{ product.title }}</h3>
          <p>{{ product.basePrice }} €</p>
          <span class="sales-badge">{{ product.salesCount }} verkauft</span>
        </div>
      </div>
    </section>
  `
})
export class HomepageComponent implements OnInit {
  featuredProducts: Product[] = [];
  topProducts: Product[] = [];
  storeId = 1; // Ihre Store-ID

  constructor(private productService: ProductService) {}

  ngOnInit() {
    // Featured Products laden
    this.productService.getFeaturedProducts(this.storeId).subscribe({
      next: (products) => {
        this.featuredProducts = products;
      }
    });

    // Top 6 Bestseller laden
    this.productService.getTopProducts(this.storeId, 6).subscribe({
      next: (products) => {
        this.topProducts = products;
      }
    });
  }
}
```

## 📊 Produktstatistiken

Jedes Produkt hat automatisch folgende Tracking-Felder:

- **viewCount**: Wie oft wurde das Produkt angesehen
- **salesCount**: Wie oft wurde das Produkt verkauft
- **isFeatured**: Ist das Produkt als Featured markiert
- **featuredOrder**: Sortierreihenfolge der Featured Products

### Statistiken im Admin anzeigen:

```typescript
<div class="product-stats">
  <p>👁️ Aufrufe: {{ product.viewCount || 0 }}</p>
  <p>🛒 Verkäufe: {{ product.salesCount || 0 }}</p>
  <p *ngIf="product.viewCount && product.salesCount">
    📈 Conversion: {{ (product.salesCount / product.viewCount * 100).toFixed(2) }}%
  </p>
</div>
```

## 🎯 Best Practices

### 1. **Begrenzen Sie Featured Products**
- Empfohlung: 3-8 Featured Products
- Zu viele Featured Products verlieren an Wirkung

### 2. **Sortierreihenfolge strategisch nutzen**
```
Order 1 = Neue Kollektion
Order 2 = Bestseller
Order 3 = Saisonales Angebot
Order 4-10 = Weitere Highlights
```

### 3. **Featured Products regelmäßig aktualisieren**
- Wöchentlich oder monatlich wechseln
- Saisonale Produkte hervorheben
- Top-Seller automatisch promoten

### 4. **Performance-basierte Auswahl**
```typescript
// Produkte mit guter Performance automatisch als Featured vorschlagen
suggestFeaturedProducts() {
  this.productService.getTopProducts(this.storeId, 10).subscribe({
    next: (products) => {
      // Zeige Vorschläge basierend auf Verkaufszahlen
      console.log('Diese Produkte könnten Featured werden:', products);
    }
  });
}
```

## 🔧 Troubleshooting

### Problem: Featured-Spalte wird nicht angezeigt
**Lösung**: Cache leeren und Seite neu laden
```bash
Strg + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Problem: Änderungen werden nicht gespeichert
**Lösung**: 
1. Prüfen Sie die Browser-Konsole auf Fehler
2. Stellen Sie sicher, dass Sie eingeloggt sind
3. Prüfen Sie, ob Sie die Berechtigung haben, Produkte zu bearbeiten

### Problem: Featured Products erscheinen nicht im Storefront
**Lösung**:
1. Stellen Sie sicher, dass die Produkte den Status "ACTIVE" haben
2. Prüfen Sie, ob die Produkte wirklich als Featured markiert sind (⭐)
3. Checken Sie die API-Response in den Developer Tools

## 📝 API-Referenz

### Admin Endpoints (Authentifizierung erforderlich):

```http
POST /api/stores/{storeId}/products/{productId}/featured
Content-Type: application/json

{
  "featured": true,
  "order": 1
}
```

### Öffentliche Endpoints (keine Authentifizierung):

```http
# Featured Products abrufen
GET /api/stores/{storeId}/products/featured

# Top Seller
GET /api/stores/{storeId}/products/top?limit=10

# Trending Products
GET /api/stores/{storeId}/products/trending?limit=10

# Neue Produkte
GET /api/stores/{storeId}/products/new?limit=10
```

## ✅ Checkliste

- [x] Featured-Spalte in Produktliste hinzugefügt
- [x] Toggle-Button für Featured Status
- [x] Order-Input für Sortierreihenfolge
- [x] Visuelles Feedback (Stern-Symbol)
- [x] Service-Methoden im ProductService
- [x] Backend-Endpoints implementiert
- [x] Model-Interfaces aktualisiert
- [ ] Storefront-Integration (kommt als nächstes)
- [ ] Featured Products Carousel
- [ ] Analytics Dashboard

## 🎉 Zusammenfassung

Sie können jetzt ganz einfach Produkte als Featured markieren:

1. ✅ Produktliste öffnen
2. ✅ Auf den Stern (☆) klicken → wird zu ⭐
3. ✅ Optional: Sortierreihenfolge eingeben
4. ✅ Fertig! Das Produkt ist jetzt Featured

Die Featured Products können dann im Storefront über die öffentlichen API-Endpoints abgerufen und angezeigt werden.

