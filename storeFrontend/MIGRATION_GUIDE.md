# Migration Guide: Einheitliches Page-Header-System

## Schnellstart - So migrierst du eine Komponente

### Schritt 1: Import hinzufügen

```typescript
// Vorher
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Nachher
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
```

### Schritt 2: Import zur Component hinzufügen

```typescript
@Component({
  // Vorher
  imports: [CommonModule, ReactiveFormsModule]
  
  // Nachher
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent]
})
```

### Schritt 3: Template aktualisieren

```html
<!-- Vorher -->
<div class="form-header">
  <h1>{{ title }}</h1>
  <button class="btn-back" (click)="goBack()">Zurück</button>
</div>

<!-- Nachher -->
<app-page-header
  [title]="title"
  [showBackButton]="true"
></app-page-header>
```

### Schritt 4: HeaderActions hinzufügen (optional)

```typescript
export class MyComponent {
  // Neu hinzufügen
  headerActions: HeaderAction[] = [
    {
      label: 'common.save',
      class: 'btn-save',
      onClick: () => this.onSubmit()
    }
  ];
}
```

### Schritt 5: Alte Header-Styles entfernen

```typescript
styles: [`
  // Diese Styles können gelöscht werden:
  .form-header { ... }
  .form-header h1 { ... }
  .btn-back { ... }
  
  // Behalte nur komponentenspezifische Styles
`]
```

## Automatisiertes Find & Replace Pattern

### Pattern 1: Standard Form Header

**Suchen:**
```
<div class="form-header">
  <h1>{{ *title* }}</h1>
  <button class="btn-back" (click)="goBack()">*backText*</button>
</div>
```

**Ersetzen mit:**
```html
<app-page-header
  [title]="*title*"
  [showBackButton]="true"
></app-page-header>
```

### Pattern 2: Header mit Actions

**Wenn du im Template Buttons wie diese hast:**
```html
<div class="actions">
  <button (click)="save()">Speichern</button>
  <button (click)="delete()">Löschen</button>
</div>
```

**Verschiebe sie zu headerActions:**
```typescript
headerActions: HeaderAction[] = [
  { label: 'common.save', class: 'btn-save', onClick: () => this.save() },
  { label: 'common.delete', class: 'btn-delete', onClick: () => this.delete() }
];
```

## Komponenten-Liste mit Migrations-Status

### ✅ Abgeschlossen

- [x] `category-form.component.ts`
- [x] `product-form.component.ts`
- [x] `cart.component.ts`

### 🔄 In Progress

#### Admin - Products
```bash
# 1. Product List
src/app/features/products/product-list.component.ts

# Template ändern:
<div class="products-header">
  <h1>Products</h1>
  <button (click)="createProduct()">Create</button>
</div>
# →
<app-page-header
  title="products.list"
  [actions]="[{ label: 'products.create', class: 'btn-primary', onClick: () => createProduct() }]"
></app-page-header>
```

#### Admin - Orders
```bash
# 2. Orders Professional
src/app/features/stores/orders-professional.component.ts

# Template ändern:
<div class="orders-header">
  <h1>Orders</h1>
  <button (click)="refresh()">Refresh</button>
</div>
# →
<app-page-header
  title="orders.list"
  [actions]="[
    { label: 'common.refresh', class: 'btn-secondary', icon: '🔄', onClick: () => refresh() },
    { label: 'orders.export', class: 'btn-secondary', onClick: () => exportOrders() }
  ]"
></app-page-header>
```

#### Admin - Order Detail
```bash
# 3. Order Detail Professional
src/app/features/stores/order-detail-professional.component.scss

# SCSS bereits vorbereitet mit .btn-back responsive styles
# Template ändern:
<div class="detail-header">
  <div class="header-left">
    <button class="btn-back" (click)="goBack()">← Back</button>
    <h1>#{{ order.orderNumber }}</h1>
  </div>
  <div class="header-right">
    <button (click)="updateStatus()">Update</button>
  </div>
</div>
# →
<app-page-header
  [title]="'#' + order.orderNumber"
  [showBackButton]="true"
  [actions]="headerActions"
></app-page-header>

# Component:
headerActions: HeaderAction[] = [
  { 
    label: 'order.updateStatus', 
    class: 'btn-primary', 
    onClick: () => this.updateStatus() 
  }
];
```

#### Admin - Store Settings
```bash
# 4. Store Settings
src/app/features/stores/store-settings.component.ts

# Template:
<app-page-header
  title="store.settings"
  [showBackButton]="true"
  [actions]="[
    { label: 'common.save', class: 'btn-save', disabled: !settingsForm.valid, onClick: () => save() }
  ]"
></app-page-header>
```

#### Admin - Store List
```bash
# 5. Store List
src/app/features/stores/store-list.component.ts

# Template:
<app-page-header
  title="stores.list"
  [showBackButton]="false"
  [actions]="[
    { label: 'stores.create', class: 'btn-primary', icon: '➕', onClick: () => createStore() }
  ]"
></app-page-header>
```

#### Storefront
```bash
# 6. Checkout
src/app/features/storefront/checkout.component.ts

# Template:
<app-page-header
  title="checkout.title"
  [showBackButton]="true"
  [backButtonText]="'checkout.backToCart'"
></app-page-header>

# 7. Order History
src/app/features/customer/order-history.component.ts

# Template:
<app-page-header
  title="orders.myOrders"
  [showBackButton]="true"
></app-page-header>
```

#### Settings
```bash
# 8. Theme Customizer
src/app/features/settings/theme-customizer.component.scss

# Bereits teilweise vorbereitet
# Template aktualisieren:
<app-page-header
  title="theme.customize"
  [showBackButton]="true"
  [actions]="[
    { label: 'theme.reset', class: 'btn-secondary', onClick: () => reset() },
    { label: 'theme.save', class: 'btn-save', onClick: () => save() }
  ]"
></app-page-header>
```

## Testing Checklist

Nach der Migration jeder Komponente:

### Funktional
- [ ] Zurück-Button funktioniert
- [ ] Actions führen korrekte Funktionen aus
- [ ] Disabled State funktioniert
- [ ] Titel wird korrekt übersetzt

### Visual
- [ ] Header sieht konsistent aus
- [ ] Buttons sind korrekt ausgerichtet (links/rechts)
- [ ] Responsive: Mobile-View funktioniert
- [ ] Theme-Wechsel funktioniert

### Accessibility
- [ ] Keyboard-Navigation funktioniert
- [ ] Screen Reader kann Elemente lesen
- [ ] Focus States sind sichtbar

## Häufige Probleme & Lösungen

### Problem 1: "goBack() is not defined"

**Fehler:**
```
Property 'goBack' does not exist on type 'PageHeaderComponent'
```

**Lösung:**
Du musst nicht mehr `goBack()` definieren. Die PageHeaderComponent macht das automatisch:

```typescript
// Lösche diese Methode:
goBack(): void {
  this.location.back();
}
```

### Problem 2: Custom Back Navigation

**Szenario:** Du brauchst spezielle Logik beim Zurück-Klick

**Lösung 1 - Mit backRoute:**
```html
<app-page-header
  [backRoute]="'/admin/products'"
></app-page-header>
```

**Lösung 2 - Mit Event Handler:**
```html
<app-page-header
  (backClick)="handleCustomBack()"
></app-page-header>
```

```typescript
handleCustomBack(): void {
  // Custom logic hier
  if (this.hasUnsavedChanges()) {
    if (confirm('Änderungen verwerfen?')) {
      this.router.navigate(['/admin/products']);
    }
  } else {
    this.router.navigate(['/admin/products']);
  }
}
```

### Problem 3: Action Button mit Dynamic State

**Szenario:** Button-Text ändert sich (z.B. "Speichern" → "Speichert...")

**Lösung:**
```typescript
get headerActions(): HeaderAction[] {
  return [
    {
      label: this.saving ? 'common.saving' : 'common.save',
      class: 'btn-save',
      disabled: this.saving || !this.form.valid,
      onClick: () => this.save()
    }
  ];
}
```

### Problem 4: Conditional Actions

**Szenario:** Buttons sollen nur unter bestimmten Bedingungen angezeigt werden

**Lösung:**
```typescript
get headerActions(): HeaderAction[] {
  const actions: HeaderAction[] = [
    { label: 'common.save', class: 'btn-save', onClick: () => this.save() }
  ];
  
  if (this.isEditMode) {
    actions.push({
      label: 'common.delete',
      class: 'btn-delete',
      onClick: () => this.delete()
    });
  }
  
  return actions;
}
```

## Performance Tipps

### 1. Verwende Getter für dynamische Actions

```typescript
// ✅ Gut - automatische Updates
get headerActions(): HeaderAction[] {
  return [
    {
      disabled: !this.form.valid,  // Reaktiv
      onClick: () => this.save()
    }
  ];
}

// ❌ Schlecht - muss manuell aktualisiert werden
headerActions: HeaderAction[] = [
  {
    disabled: false,  // Statisch
    onClick: () => this.save()
  }
];
```

### 2. Verwende OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

## Nächste Schritte

1. **Priorität 1:** Admin-Formulare (weil sie am häufigsten verwendet werden)
   - [x] category-form ✅
   - [x] product-form ✅
   - [ ] store-settings
   - [ ] homepage-builder

2. **Priorität 2:** Storefront (Kundensichtbar)
   - [x] cart ✅
   - [ ] checkout
   - [ ] order-history

3. **Priorität 3:** Admin-Listen
   - [ ] product-list
   - [ ] orders-professional
   - [ ] store-list

4. **Priorität 4:** Detail-Seiten
   - [ ] order-detail-professional
   - [ ] store-detail

## Automatisierung mit Script (Optional)

Für bulk migrations kannst du ein Script erstellen:

```bash
# migrate-headers.sh
#!/bin/bash

# Liste aller zu migrierenden Dateien
FILES=(
  "src/app/features/products/product-list.component.ts"
  "src/app/features/stores/store-settings.component.ts"
  # ... mehr Dateien
)

for file in "${FILES[@]}"; do
  echo "Migrating $file..."
  # Führe automatische Replacements aus
  # (sed commands here)
done
```

## Support

Bei Fragen:
1. Siehe `PAGE_HEADER_SYSTEM.md` für Details
2. Siehe migrierte Komponenten als Beispiel
3. Teste in allen Breakpoints (Desktop, Tablet, Mobile)

