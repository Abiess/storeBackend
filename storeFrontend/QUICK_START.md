- [ ] Quick-View funktioniert

---

## 🐛 Troubleshooting

### ❌ Error: "Can't bind to 'ngModel'"

**Problem:** FormsModule fehlt in ModernStoreHeaderComponent

**Lösung:** Ist bereits importiert in `modern-store-header.component.ts`

---

### ❌ Sidebar zeigt sich nicht auf Mobile

**Lösung:** Prüfe z-index in `store-layout.component.ts`:
```scss
.store-sidebar {
  z-index: 1001; // Muss höher als Overlay (1000) sein
}
```

---

### ❌ Products werden nicht angezeigt

**Lösung 1:** Prüfe ob `displayedProducts` im Template verwendet wird:
```html
*ngFor="let product of displayedProducts || filteredProducts"
```

**Lösung 2:** Prüfe Console auf Fehler:
```
F12 → Console Tab
```

---

### ❌ Layout bricht auf Tablet

**Lösung:** Prüfe Viewport Meta-Tag in `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

---

### 🔙 Rückgängig machen

**Einfach die Backups wiederherstellen:**

**Windows:**
```cmd
cd src\app\features\storefront
move /Y storefront.component.html.backup storefront.component.html
move /Y storefront.component.scss.backup storefront.component.scss
```

**Linux/Mac:**
```bash
cd src/app/features/storefront
mv storefront.component.html.backup storefront.component.html
mv storefront.component.scss.backup storefront.component.scss
```

---

## 🎓 Weitere Anpassungen

### Category Icons ändern

In `store-sidebar.component.ts` → `getCategoryIcon()`:

```typescript
getCategoryIcon(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Eigene Icons hinzufügen:
  if (lowerName.includes('sale')) return '🔥';
  if (lowerName.includes('neu')) return '✨';
  
  return '🏷️'; // Default
}
```

### Grid-Spalten anpassen

In `product-grid.component.ts`:

```scss
.products-grid {
  // 3 Spalten fest:
  grid-template-columns: repeat(3, 1fr);
  
  // Oder kleinere Cards:
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
```

### Max-Width ändern

In allen Component-Styles:

```scss
.header-container,
.footer-container {
  max-width: 1200px; // Statt 1400px
}
```

---

## 📚 Dokumentation

**Vollständige Dokumentation:**
→ `storeFrontend/MODERN_LAYOUT_GUIDE.md`

Enthält:
- Detaillierte Component-Features
- Design System (Colors, Spacing, Typography)
- Responsive Breakpoints
- Performance Tipps
- Accessibility Guidelines
- Weitere Verbesserungen (Filter, Sort, Pagination)

---

## 🚀 Start

```bash
# Backend starten (Terminal 1)
cd storeBackend
./mvnw spring-boot:run

# Frontend starten (Terminal 2)
cd storeFrontend
npm start
```

**Öffne:** http://localhost:4200

---

## ✨ Das war's!

Das moderne Layout ist jetzt einsatzbereit. Bei Fragen:
→ Siehe `MODERN_LAYOUT_GUIDE.md`

**Wichtig:**
- ✅ Keine Breaking Changes an bestehender Business-Logik
- ✅ Alle Routes bleiben unverändert
- ✅ Backend/APIs bleiben unverändert
- ✅ 100% rückwärts-kompatibel

---

**Viel Erfolg! 🎉**
# 🚀 Modern Store Frontend - Quick Start Guide

## ✨ Was wurde erstellt?

Ein modernes, professionelles Store Frontend Layout im **idealo.de-Stil** mit:

✅ **5 neue Standalone Angular Komponenten**  
✅ **Responsive Design** (Desktop → Tablet → Mobile)  
✅ **Modern Product Cards** mit Hover-Effekten  
✅ **Category Sidebar** (Desktop) / Drawer (Mobile)  
✅ **Search Functionality**  
✅ **Skeleton Loaders**  
✅ **Clean CSS/SCSS** (keine externen UI-Libraries)  

---

## 📁 Neue Dateien

### Komponenten (Standalone)
```
src/app/features/storefront/components/
├── store-layout.component.ts          ← Layout Wrapper (Sidebar + Content)
├── store-sidebar.component.ts         ← Category Sidebar mit Icons
├── product-grid.component.ts          ← Responsive Grid mit Loading States
├── modern-product-card.component.ts   ← Product Card (idealo-style)
└── modern-store-header.component.ts   ← Header mit Search
```

### Templates & Styles
```
src/app/features/storefront/
├── storefront-modern.component.html   ← Neue moderne HTML-Struktur
└── storefront-modern.component.scss   ← Moderne SCSS-Styles
```

### Dokumentation
```
storeFrontend/
├── MODERN_LAYOUT_GUIDE.md             ← Vollständige Dokumentation
├── migrate-to-modern-layout.sh        ← Migrations-Script (Linux/Mac)
└── migrate-to-modern-layout.bat       ← Migrations-Script (Windows)
```

---

## 🎯 Integration - 3 Optionen

### Option 1: Automatische Migration (Empfohlen) ⚡

**Windows:**
```cmd
cd storeFrontend
migrate-to-modern-layout.bat
```

**Linux/Mac:**
```bash
cd storeFrontend
chmod +x migrate-to-modern-layout.sh
./migrate-to-modern-layout.sh
```

Das Script:
- ✅ Erstellt Backup der alten Dateien
- ✅ Aktiviert neue Templates/Styles
- ✅ Prüft ob alle Komponenten vorhanden sind

---

### Option 2: Manuelle Migration 🛠️

**Schritt 1:** Backup erstellen
```bash
cd src/app/features/storefront
cp storefront.component.html storefront.component.html.backup
cp storefront.component.scss storefront.component.scss.backup
```

**Schritt 2:** Neue Dateien aktivieren
```bash
mv storefront-modern.component.html storefront.component.html
mv storefront-modern.component.scss storefront.component.scss
```

**Schritt 3:** Code in `storefront.component.ts` ergänzen

Füge diese Methoden am Ende der Klasse hinzu:

```typescript
// Such-Funktionalität
searchQuery = '';

onSearchChange(query: string): void {
  this.searchQuery = query.toLowerCase();
  console.log('🔍 Suche nach:', query);
}

// Gefilterte Produkte mit Suche
get displayedProducts(): Product[] {
  let products = this.filteredProducts;
  
  if (this.searchQuery) {
    products = products.filter(p => 
      p.name?.toLowerCase().includes(this.searchQuery) ||
      p.description?.toLowerCase().includes(this.searchQuery)
    );
  }
  
  return products;
}
```

**Schritt 4:** Teste die Anwendung
```bash
npm start
```

---

### Option 3: Parallel betreiben (A/B Testing) 🔀

**Für vorsichtige Migration oder Testing:**

In `storefront.component.ts` Feature Flag hinzufügen:

```typescript
export class StorefrontComponent implements OnInit, OnDestroy {
  // Feature Flag
  useModernLayout = true; // Auf false setzen für altes Layout
  
  // ...rest of code
}
```

In `storefront.component.html`:

```html
<!-- Modern Layout -->
<ng-container *ngIf="useModernLayout">
  <!-- Inhalt von storefront-modern.component.html hier einfügen -->
</ng-container>

<!-- Legacy Layout -->
<ng-container *ngIf="!useModernLayout">
  <!-- Alter Inhalt bleibt unverändert -->
</ng-container>
```

---

## 🎨 Design Features

### Desktop (>1024px)
- Sidebar links (280px breit)
- Grid rechts (3-4 Spalten)
- Hover-Effekte auf Cards
- Quick-View Overlay

### Tablet (768-1024px)
- Kleinere Sidebar (240px)
- 2-3 Spalten Grid
- Responsive Schriftgrößen

### Mobile (<768px)
- Sidebar als Drawer (85% Bildschirmbreite)
- Toggle-Button (unten rechts)
- 2 Spalten Grid
- Vereinfachte Navigation

### Small Mobile (<480px)
- 1 Spalte
- Optimierte Touch-Targets
- Vereinfachte Labels

---

## 🧩 Component Usage

### StoreLayoutComponent
```html
<app-store-layout>
  <div sidebar>
    <app-store-sidebar [categories]="categories"></app-store-sidebar>
  </div>
  <div main>
    <app-product-grid [products]="products"></app-product-grid>
  </div>
</app-store-layout>
```

### ModernStoreHeaderComponent
```html
<app-modern-store-header
  [storeName]="store?.name"
  [cartItemCount]="cartItemCount"
  (cartClick)="goToCart()"
  (searchChange)="onSearchChange($event)">
</app-modern-store-header>
```

### ModernProductCardComponent
```html
<app-modern-product-card
  [product]="product"
  [isAddingToCart]="addingToCart"
  (addToCart)="addToCart($event)"
  (quickView)="openQuickView($event)">
</app-modern-product-card>
```

---

## ✅ Checkliste

Nach der Integration:

- [ ] Alle 5 Komponenten vorhanden
- [ ] storefront.component.ts imports aktualisiert
- [ ] Neue Template aktiviert
- [ ] Suchfunktion hinzugefügt
- [ ] Responsive auf allen Breakpoints getestet
- [ ] Browser-Kompatibilität geprüft (Chrome, Firefox, Safari, Edge)
- [ ] Mobile Drawer funktioniert
- [ ] Produkte werden korrekt angezeigt
- [ ] Warenkorb-Funktionalität intakt

