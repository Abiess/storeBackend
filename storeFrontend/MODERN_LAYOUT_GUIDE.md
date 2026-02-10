
### 2. StoreSidebarComponent

**Features:**
- Automatische Icon-Zuweisung basierend auf Kategorie-Namen
- Active state highlighting
- Product count badges
- Smooth hover effects

**Usage:**
```html
<app-store-sidebar
  [categories]="categories"
  [selectedCategory]="selectedCategory"
  (categorySelect)="selectCategory($event)">
</app-store-sidebar>
```

### 3. ProductGridComponent

**Features:**
- Skeleton loader während Ladezeit
- Empty state für keine Produkte
- Responsive grid (auto-fill)
- Optional compact mode

**Usage:**
```html
<app-product-grid
  [products]="products"
  [loading]="loading"
  [title]="'Alle Produkte'"
  [compact]="false">
  
  <!-- Product cards als children -->
  <app-modern-product-card
    *ngFor="let product of products"
    [product]="product">
  </app-modern-product-card>
</app-product-grid>
```

### 4. ModernProductCardComponent

**Features:**
- Clean design mit Bildern, Preisen, Buttons
- Hover elevation effect
- Quick view overlay
- Badges (New, Sale, Out of Stock)
- Stock indicator
- Responsive font sizes

**Usage:**
```html
<app-modern-product-card
  [product]="product"
  [isAddingToCart]="false"
  [showDescription]="true"
  [isNew]="false"
  (addToCart)="onAddToCart($event)"
  (quickView)="onQuickView($event)">
</app-modern-product-card>
```

### 5. ModernStoreHeaderComponent

**Features:**
- Store name/logo
- Search bar (desktop & mobile)
- Account button
- Cart button mit Badge
- Sticky positioning

**Usage:**
```html
<app-modern-store-header
  [storeName]="'My Shop'"
  [cartItemCount]="5"
  [showSearch]="true"
  [showAccount]="true"
  (cartClick)="goToCart()"
  (accountClick)="goToAccount()"
  (searchChange)="onSearchChange($event)">
</app-modern-store-header>
```

## 📱 Responsive Breakpoints

```scss
/* Desktop */
1400px: Max container width
1024px+: Full sidebar + grid

/* Tablet */
768px - 1024px: Smaller sidebar, 2-3 columns

/* Mobile */
< 768px: Drawer sidebar, 2 columns
< 480px: Single column, hidden labels
```

## 🎨 Design System

### Colors

```scss
/* Primary */
$primary: #2563eb;
$primary-hover: #1d4ed8;

/* Neutrals */
$gray-50: #f9fafb;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-300: #d1d5db;
$gray-600: #6b7280;
$gray-900: #111827;

/* Accents */
$success: #10b981;
$error: #ef4444;
$warning: #f59e0b;
```

### Spacing Scale

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
$spacing-xl: 24px;
$spacing-2xl: 32px;
$spacing-3xl: 48px;
```

### Typography

```scss
$font-size-xs: 12px;
$font-size-sm: 13px;
$font-size-base: 14px;
$font-size-md: 15px;
$font-size-lg: 18px;
$font-size-xl: 20px;
$font-size-2xl: 24px;
```

### Shadows

```scss
$shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
$shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### Border Radius

```scss
$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 10px;
$radius-xl: 12px;
```

## 🔧 Anpassungen

### Custom Category Icons

In `store-sidebar.component.ts` - `getCategoryIcon()` Methode:

```typescript
getCategoryIcon(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Füge eigene Mappings hinzu:
  if (lowerName.includes('custom')) return '🎯';
  
  return '🏷️'; // Default
}
```

### Grid Columns anpassen

In `product-grid.component.ts`:

```scss
.products-grid {
  // Standard: auto-fill, minmax(280px, 1fr)
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); // Kleinere Cards
  // oder
  grid-template-columns: repeat(4, 1fr); // Feste 4 Spalten
}
```

### Max Width ändern

Global in den Component-Styles:

```scss
.header-container,
.footer-container,
.hero-section,
.featured-sections {
  max-width: 1200px; // Statt 1400px
}
```

## ⚡ Performance

### Lazy Loading Images

Alle Product Cards nutzen bereits:
```html
<img loading="lazy" ...>
```

### Virtual Scrolling (Optional)

Für sehr viele Produkte (>100):

```typescript
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

// In template:
<cdk-virtual-scroll-viewport itemSize="400">
  <app-modern-product-card
    *cdkVirtualFor="let product of products"
    [product]="product">
  </app-modern-product-card>
</cdk-virtual-scroll-viewport>
```

## 🧪 Testing

### Responsive Testing

```bash
# Chrome DevTools
1. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
2. Teste verschiedene Viewports:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)
```

### Accessibility Testing

```bash
# Install axe DevTools Extension
# Oder verwende Lighthouse in Chrome DevTools
```

## 🐛 Troubleshooting

### Problem: Sidebar zeigt sich nicht auf Mobile

**Lösung:** Prüfe z-index in store-layout.component.ts:

```scss
.store-sidebar {
  z-index: 1001; // Muss höher als Overlay sein
}
```

### Problem: Product Cards zu klein/groß

**Lösung:** Passe minmax() in product-grid.component.ts an:

```scss
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
//                                           ^^^^^ Hier anpassen
```

### Problem: Suche funktioniert nicht

**Lösung:** Stelle sicher, dass `displayedProducts` Getter existiert und im Template verwendet wird:

```html
<app-modern-product-card
  *ngFor="let product of displayedProducts">
```

## 📚 Weitere Verbesserungen

### 1. Filterung erweitern

```typescript
// Preis-Filter
priceRange = { min: 0, max: 1000 };

get displayedProducts(): Product[] {
  return this.filteredProducts.filter(p => 
    p.price >= this.priceRange.min && 
    p.price <= this.priceRange.max
  );
}
```

### 2. Sortierung hinzufügen

```typescript
sortBy: 'price' | 'name' | 'new' = 'name';

get displayedProducts(): Product[] {
  const products = [...this.filteredProducts];
  
  switch(this.sortBy) {
    case 'price': 
      return products.sort((a, b) => a.price - b.price);
    case 'name': 
      return products.sort((a, b) => a.name.localeCompare(b.name));
    default: 
      return products;
  }
}
```

### 3. Pagination

```typescript
currentPage = 1;
itemsPerPage = 20;

get displayedProducts(): Product[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  return this.filteredProducts.slice(start, start + this.itemsPerPage);
}
```

## ✅ Checklist

- [ ] Neue Components erstellt
- [ ] storefront.component.ts imports aktualisiert
- [ ] storefront.component.html ersetzt (oder parallel betrieben)
- [ ] Responsive Breakpoints getestet
- [ ] Browser-Kompatibilität geprüft
- [ ] Accessibility geprüft
- [ ] Performance optimiert (lazy loading, etc.)
- [ ] Dokumentation gelesen

## 🎉 Fertig!

Das moderne Layout ist jetzt einsatzbereit. Bei Fragen oder Problemen, siehe Troubleshooting-Sektion oben.

---

**Erstellt:** 2026-02-10  
**Version:** 1.0  
**Autor:** DevOps Team
# 🎨 Modern Store Frontend Layout - Implementation Guide

## 📋 Übersicht

Ein modernes, professionelles Store Frontend Layout inspiriert von idealo.de mit:
- ✅ Clean white design
- ✅ Responsive grid system
- ✅ Left sidebar (desktop) / Mobile drawer
- ✅ Modern product cards mit hover effects
- ✅ Skeleton loaders
- ✅ Mobile-first approach
- ✅ Max-width container (1400px)
- ✅ Smooth transitions

## 📁 Neue Dateien

### Layout Components

```
storeFrontend/src/app/features/storefront/components/
├── store-layout.component.ts          # Main layout wrapper
├── store-sidebar.component.ts         # Category sidebar
├── product-grid.component.ts          # Responsive product grid
├── modern-product-card.component.ts   # Modern product cards
└── modern-store-header.component.ts   # Clean header with search
```

### Template & Styles

```
storeFrontend/src/app/features/storefront/
├── storefront-modern.component.html   # New modern template
└── storefront-modern.component.scss   # Modern styles
```

## 🚀 Integration

### Option 1: Komplett auf neues Layout umstellen

**Schritt 1:** Backup erstellen
```bash
cd storeFrontend/src/app/features/storefront
cp storefront.component.html storefront.component.html.backup
cp storefront.component.scss storefront.component.scss.backup
```

**Schritt 2:** Neue Files aktivieren
```bash
# Ersetze alte mit neuen Files
mv storefront-modern.component.html storefront.component.html
mv storefront-modern.component.scss storefront.component.scss
```

**Schritt 3:** Component-Code erweitern

Füge in `storefront.component.ts` folgende Methoden hinzu (falls noch nicht vorhanden):

```typescript
// NEW: Suchfunktion
searchQuery = '';

onSearchChange(query: string): void {
  this.searchQuery = query.toLowerCase();
  console.log('🔍 Suche nach:', query);
}

// NEW: Gefilterte Produkte mit Suche
get displayedProducts(): Product[] {
  let products = this.filteredProducts;
  
  // Suche anwenden
  if (this.searchQuery) {
    products = products.filter(p => 
      p.name?.toLowerCase().includes(this.searchQuery) ||
      p.description?.toLowerCase().includes(this.searchQuery)
    );
  }
  
  return products;
}
```

### Option 2: Parallel betreiben (A/B Testing)

**Schritt 1:** Feature Flag hinzufügen

In `storefront.component.ts`:

```typescript
export class StorefrontComponent implements OnInit, OnDestroy {
  // Feature Flag
  useModernLayout = true; // oder über Service/Config laden
  
  // ...existing code...
}
```

**Schritt 2:** Conditional Template

In `storefront.component.html`:

```html
<!-- Modern Layout -->
<ng-container *ngIf="useModernLayout">
  <!-- Inhalt von storefront-modern.component.html -->
</ng-container>

<!-- Legacy Layout -->
<ng-container *ngIf="!useModernLayout">
  <!-- Alter Inhalt bleibt hier -->
</ng-container>
```

## 🎯 Component Features

### 1. StoreLayoutComponent

**Responsive Verhalten:**
- **Desktop (>1024px):** Sidebar links, Content rechts
- **Tablet (768-1024px):** Kleinere Sidebar
- **Mobile (<768px):** Sidebar als Drawer, Toggle-Button

**Usage:**
```html
<app-store-layout>
  <div sidebar>
    <!-- Sidebar content -->
  </div>
  <div main>
    <!-- Main content -->
  </div>
</app-store-layout>
```

