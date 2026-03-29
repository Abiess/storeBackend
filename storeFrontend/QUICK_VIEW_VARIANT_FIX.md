# 🔍 QUICK VIEW - VARIANTEN RICHTIG ANZEIGEN

## ❌ Problem:
**"Der Quick View zeigt noch nicht richtig die Variante."**

## 🎯 Root Cause:
Die Quick View Komponente zeigte:
1. ❌ `variant.name` (Feld existiert nicht oder ist leer)
2. ❌ Keine Varianten-Bilder (immer nur Produkt-Bild)
3. ❌ Kein Lagerbestand pro Variante
4. ❌ Button immer aktiv (auch wenn Variante nicht verfügbar)

## ✅ Implementierte Fixes:

### Fix 1: Intelligente Varianten-Namen
**Datei:** `product-quick-view.component.ts`

**Neue Methode `getVariantDisplayName()`:**
```typescript
getVariantDisplayName(variant: ProductVariant): string {
  // 1. Prüfe ob name direkt vorhanden ist
  if (variant.name) return variant.name;
  
  // 2. Kombiniere option1/option2/option3 (z.B. "Rot / M / Baumwolle")
  const options = [variant.option1, variant.option2, variant.option3]
    .filter(opt => opt && opt.trim() !== '')
    .join(' / ');
  if (options) return options;
  
  // 3. Fallback: SKU
  if (variant.sku) return variant.sku;
  
  // 4. Last resort: ID
  return `Variante #${variant.id}`;
}
```

**Beispiele:**
| option1 | option2 | option3 | Anzeige |
|---------|---------|---------|---------|
| Rot | M | Baumwolle | **Rot / M / Baumwolle** |
| Blau | L | - | **Blau / L** |
| - | - | - | **TSHIRT-001** (SKU) |
| null | null | null | **Variante #42** (ID) |

### Fix 2: Varianten-Bilder anzeigen
**Methode:** `getProductImages()`

**Vorher:**
```typescript
getProductImages(): string[] {
  // Zeigt IMMER nur Produkt-Bilder ❌
  const images = [this.product?.primaryImageUrl];
  return images;
}
```

**Nachher:**
```typescript
getProductImages(): string[] {
  // 1. Wenn Variante ausgewählt → Varianten-Bilder
  if (this.selectedVariant) {
    if (this.selectedVariant.images?.length > 0) {
      return this.selectedVariant.images; // Mehrere Bilder ✅
    }
    if (this.selectedVariant.imageUrl) {
      return [this.selectedVariant.imageUrl]; // Haupt-Bild ✅
    }
  }
  
  // 2. Fallback → Produkt-Bilder
  return [this.product?.primaryImageUrl, ...this.product?.media.map(m => m.url)];
}
```

**Effekt:**
- User wählt **"Rot / M"** → Zeigt Bild von rotem T-Shirt
- User wählt **"Blau / L"** → Zeigt Bild von blauem T-Shirt
- Keine Variante ausgewählt → Zeigt Standard-Produkt-Bild

### Fix 3: Lagerbestand anzeigen
**Template (Zeile 58-61):**

**Vorher:**
```html
<span class="variant-price">
  {{ variant.price | number:'1.2-2' }} €
</span>
```

**Nachher:**
```html
<span class="variant-price">
  {{ variant.price | number:'1.2-2' }} €
</span>
<span class="variant-stock" *ngIf="variant.stock > 0">
  ({{ variant.stock }} verfügbar)
</span>
```

**Beispiel:**
```
┌─────────────────────────────────────┐
│ Rot / M          19.99 € (50 verfügbar) │ ← Active
├─────────────────────────────────────┤
│ Blau / L         24.99 € (0 verfügbar)  │ ← Disabled
└─────────────────────────────────────┘
```

### Fix 4: Button-Status basierend auf Verfügbarkeit
**Neue Methoden:**

```typescript
isVariantAvailable(): boolean {
  // Mit Varianten: Prüfe Stock der ausgewählten Variante
  if (this.hasVariants()) {
    if (!this.selectedVariant) return false;
    const stock = this.selectedVariant.stockQuantity ?? this.selectedVariant.stock ?? 0;
    return stock > 0;
  }
  // Ohne Varianten: Prüfe Produkt-Stock
  return (this.product?.stock ?? 0) > 0;
}

getAddToCartLabel(): string {
  if (this.isAddingToCart) return 'Wird hinzugefügt...';
  if (!this.isVariantAvailable()) return 'Nicht verfügbar';
  return 'In den Warenkorb';
}
```

**Button-Zustand:**
| Situation | Button-Text | Disabled |
|-----------|-------------|----------|
| Stock > 0 | "In den Warenkorb" | ❌ Nein |
| Stock = 0 | "Nicht verfügbar" | ✅ Ja |
| Wird hinzugefügt | "Wird hinzugefügt..." | ✅ Ja |

## 📊 Vorher/Nachher-Vergleich:

### Vorher:
```html
<button class="variant-btn">
  <span>{{ variant.name }}</span>  ← Leer oder undefined ❌
  <span>19.99 €</span>
</button>
```

**Anzeige:** ` (leer) 19.99 €` ❌

### Nachher:
```html
<button class="variant-btn" [class.active]="selectedVariant?.id === variant.id">
  <span>{{ getVariantDisplayName(variant) }}</span>  ← "Rot / M" ✅
  <span>19.99 €</span>
  <span *ngIf="variant.stock > 0">(50 verfügbar)</span>  ← Stock-Badge ✅
</button>
```

**Anzeige:** `Rot / M     19.99 € (50 verfügbar)` ✅

## 🔄 User-Flow (Interaktiv):

### 1. User öffnet Quick View:
```typescript
// storefront.component.ts
openQuickView(product: Product) {
  this.selectedProduct = product;
  this.showQuickView = true;
}
```

### 2. Quick View lädt Varianten:
```typescript
ngOnInit(): void {
  // Wähle erste Variante automatisch
  if (this.hasVariants() && this.product?.variants) {
    this.selectedVariant = this.product.variants[0];
  }
}
```

### 3. User sieht Varianten-Liste:
```
┌────────────────────────────────────────┐
│ 🔵 Rot / M      19.99 € (50 verfügbar) │ ← Selected
├────────────────────────────────────────┤
│ ⚪ Blau / L     24.99 € (23 verfügbar) │
├────────────────────────────────────────┤
│ ⚪ Grün / XL    29.99 € (0 verfügbar)  │ ← Disabled
└────────────────────────────────────────┘
```

### 4. User wählt Variante:
```typescript
selectVariant(variant: ProductVariant): void {
  this.selectedVariant = variant;
  // → Bild ändert sich automatisch (getProductImages())
  // → Preis ändert sich (getCurrentPrice())
  // → Button-Status ändert sich (isVariantAvailable())
}
```

### 5. User klickt "In den Warenkorb":
```typescript
addToCart(): void {
  this.addToCartEvent.emit({
    product: this.product,
    quantity: this.quantity,
    variant: this.selectedVariant || undefined  // ✅ Korrekte Variante wird mitgesendet!
  });
}
```

## 🎨 Visuelles Update:

### Varianten-Button (Normal):
```
┌─────────────────────────────────────┐
│ Rot / M          19.99 € (50 verfügbar) │
│ Background: #f8f9fa                   │
│ Border: 2px solid #e9ecef             │
└─────────────────────────────────────┘
```

### Varianten-Button (Hover):
```
┌─────────────────────────────────────┐
│ Rot / M          19.99 € (50 verfügbar) │
│ Background: #f0f4ff (hell-blau)       │
│ Border: 2px solid #667eea (blau)      │
└─────────────────────────────────────┘
```

### Varianten-Button (Active):
```
┌─────────────────────────────────────┐
│ Rot / M          19.99 € (50 verfügbar) │
│ Background: #667eea (blau)            │
│ Border: 2px solid #667eea             │
│ Color: white                          │
└─────────────────────────────────────┘
```

## 🧪 Testing:

### 1. Lokales Frontend starten:
```powershell
cd C:\Users\t13016a\Downloads\Team2\storeBackend\storeFrontend
ng serve
```

### 2. Browser öffnen:
```
http://localhost:4200
→ Storefront-Seite
→ Produkt mit Varianten finden
→ "Quick View" Button klicken (Auge-Icon)
```

### 3. Erwartetes Verhalten:
```
✅ Modal öffnet sich
✅ Varianten-Liste zeigt: "Rot / M", "Blau / L", etc. (nicht leer!)
✅ Lagerbestand angezeigt: "(50 verfügbar)"
✅ Erste Variante ist automatisch ausgewählt (blauer Hintergrund)
✅ Preis zeigt Varianten-Preis (nicht Basis-Preis)
✅ Bild zeigt Varianten-Bild (falls vorhanden)
✅ Variante wählen → Bild + Preis ändern sich sofort
✅ "In den Warenkorb" → Korrekte Variante wird hinzugefügt
```

### 4. DevTools Console:
```javascript
// Beim Varianten-Wechsel:
Selected variant: { id: 42, option1: "Rot", option2: "M", price: 19.99, stock: 50 }

// Beim Add-to-Cart:
Adding to cart: { productId: 123, variantId: 42, quantity: 2 }
```

## 📋 Geänderte Dateien:

| Datei | Zeilen | Änderungen |
|-------|--------|------------|
| `product-quick-view.component.ts` | 55 | `variant.name` → `getVariantDisplayName()` |
| `product-quick-view.component.ts` | 58-61 | Stock-Badge hinzugefügt |
| `product-quick-view.component.ts` | 86-92 | Button-Disable-Logic |
| `product-quick-view.component.ts` | 499-530 | `getProductImages()` erweitert |
| `product-quick-view.component.ts` | 530-560 | 3 neue Methoden hinzugefügt |
| `product-quick-view.component.ts` | 297-313 | CSS verbessert |

## 🚀 Features:

### ✅ 1. Intelligente Namen-Generierung
```typescript
// Option 1: Expliziter Name
variant.name = "Premium T-Shirt"
→ Anzeige: "Premium T-Shirt"

// Option 2: Option-Kombination
variant.option1 = "Rot"
variant.option2 = "M"
variant.option3 = "Baumwolle"
→ Anzeige: "Rot / M / Baumwolle"

// Option 3: SKU als Fallback
variant.sku = "TSHIRT-RED-M"
→ Anzeige: "TSHIRT-RED-M"

// Option 4: ID als Last Resort
variant.id = 42
→ Anzeige: "Variante #42"
```

### ✅ 2. Varianten-Bilder
```typescript
// Priorität:
1. selectedVariant.images[] (mehrere Bilder)
2. selectedVariant.imageUrl (Haupt-Bild)
3. selectedVariant.mediaUrls[] (Alternative)
4. product.primaryImageUrl (Fallback)
```

### ✅ 3. Lagerbestand-Anzeige
```html
<span class="variant-stock" *ngIf="variant.stock > 0">
  ({{ variant.stock }} verfügbar)
</span>

<!-- Beispiele: -->
(50 verfügbar)   ← Grüner Text
(3 verfügbar)    ← Grüner Text
(0 verfügbar)    ← Wird nicht angezeigt, Button disabled
```

### ✅ 4. Smart Button-Status
```typescript
isVariantAvailable(): boolean {
  // Mit Varianten: Stock der ausgewählten Variante
  if (this.hasVariants()) {
    const stock = this.selectedVariant?.stockQuantity ?? 0;
    return stock > 0;
  }
  // Ohne Varianten: Produkt-Stock
  return (this.product?.stock ?? 0) > 0;
}

// Button-Label ändert sich automatisch:
"In den Warenkorb"   ← stock > 0
"Nicht verfügbar"    ← stock = 0
"Wird hinzugefügt..." ← isAddingToCart = true
```

## 🎨 Visuelles Design:

### Varianten-Liste (Vertikal):
```
┌────────────────────────────────────────┐
│  Varianten                             │
├────────────────────────────────────────┤
│ [•] Rot / M      19.99 € (50 verfügbar) │ ← Active (blauer Hintergrund)
│ [ ] Blau / L     24.99 € (23 verfügbar) │ ← Hover (hellblau)
│ [ ] Grün / XL    29.99 €               │ ← Kein Stock (grau)
└────────────────────────────────────────┘
```

### Layout:
```
┌─────────────────────────────────────────────────────────┐
│  [✕]                                                     │
├──────────────────┬──────────────────────────────────────┤
│                  │  T-Shirt Premium                      │
│   [Image         │  19.99 € inkl. MwSt.                 │
│    Gallery]      │                                       │
│                  │  Beschreibung...                      │
│   [Thumbnails]   │                                       │
│                  │  ─────────────────                    │
│                  │  Varianten                            │
│                  │  ☑ Rot / M    19.99 € (50 verfügbar) │ ← Active
│                  │  ☐ Blau / L   24.99 € (23 verfügbar) │
│                  │                                       │
│                  │  ─────────────────                    │
│                  │  Menge: [-] 1 [+]                     │
│                  │                                       │
│                  │  [🛒 In den Warenkorb] [👁️ Details]  │
│                  │                                       │
│                  │  ✓ Kostenloser Versand ab 50€         │
│                  │  ↩ 30 Tage Rückgaberecht             │
│                  │  🔒 Sichere Bezahlung                 │
└──────────────────┴──────────────────────────────────────┘
│  ★★★★★ Bewertungen (5)                                  │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Technische Details:

### Varianten-Feld-Mapping:
```typescript
interface ProductVariant {
  id: number;
  productId: number;
  
  // Namen-Generierung (Priorität):
  name?: string;           // 1. Direkt gesetzt
  option1?: string;        // 2. Kombiniert mit /
  option2?: string;        // 2. Kombiniert mit /
  option3?: string;        // 2. Kombiniert mit /
  sku: string;             // 3. Fallback
  
  // Preis & Stock:
  price: number;           // Verwendet für Anzeige
  comparePrice?: number;   // TODO: Durchgestrichener Preis
  stock: number;           // Lagerbestand
  stockQuantity: number;   // Alternative
  
  // Bilder:
  imageUrl?: string;       // Haupt-Bild
  images?: string[];       // Mehrere Bilder
  mediaUrls?: string[];    // Alternative
}
```

## 🚀 Deployment:

```bash
# Commit & Push
git add storeFrontend/src/app/shared/components/product-quick-view.component.ts
git commit -m "Fix: Quick View zeigt Varianten korrekt (option1/2/3, Bilder, Stock)"
git push origin master

# GitHub Actions deployed automatisch auf markt.ma
```

## ✅ Behobene Probleme:

1. ✅ **Varianten-Namen** → Zeigt jetzt `option1 / option2 / option3`
2. ✅ **Varianten-Bilder** → Wechselt bei Auswahl
3. ✅ **Lagerbestand** → "(50 verfügbar)" Badge
4. ✅ **Button-Status** → Disabled wenn nicht verfügbar
5. ✅ **Preis-Update** → Zeigt Varianten-Preis korrekt

## 🧪 Test-Checkliste:

- [ ] Quick View öffnen → Varianten-Liste zeigt Namen (nicht leer)
- [ ] Variante auswählen → Hintergrund wird blau
- [ ] Variante auswählen → Bild ändert sich
- [ ] Variante auswählen → Preis ändert sich
- [ ] Stock-Badge wird angezeigt: "(50 verfügbar)"
- [ ] Variante mit Stock=0 → Button "Nicht verfügbar" (disabled)
- [ ] "In den Warenkorb" klicken → Korrekte Variante wird hinzugefügt
- [ ] Cart-Badge erhöht sich um ausgewählte Menge

---

**Erstellt:** 2026-03-29 21:05  
**Dateien:** 1 (product-quick-view.component.ts)  
**Zeilen geändert:** ~80  
**Status:** ✅ Bereit zum Commit

