# Einheitliches Page-Header-System

## Übersicht
Alle Seiten nutzen jetzt eine zentrale `PageHeaderComponent` für ein einheitliches Layout mit konsistenter Button-Platzierung.

## Die PageHeaderComponent

### Verwendung

```typescript
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';

@Component({
  imports: [PageHeaderComponent, ...]
})
export class MyComponent {
  headerActions: HeaderAction[] = [];
}
```

```html
<app-page-header
  [title]="'page.title'"
  [subtitle]="'page.subtitle'"
  [showBackButton]="true"
  [backRoute]="'/admin/products'"
  [actions]="headerActions"
></app-page-header>
```

### Properties

| Property | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `title` | `string` | `''` | Seitentitel (wird übersetzt) |
| `subtitle` | `string?` | - | Optionaler Untertitel |
| `showBackButton` | `boolean` | `true` | Zurück-Button anzeigen |
| `backButtonText` | `string?` | `'common.back'` | Custom Text für Zurück-Button |
| `backRoute` | `string?` | - | Spezifische Route für Zurück-Navigation |
| `actions` | `HeaderAction[]` | `[]` | Action-Buttons (rechts) |

### Events

| Event | Beschreibung |
|-------|--------------|
| `backClick` | Wird ausgelöst wenn Zurück-Button geklickt wird (optional) |

## HeaderAction Interface

```typescript
interface HeaderAction {
  label: string;        // Button-Text (wird übersetzt)
  icon?: string;        // Optional: Icon-Klasse
  class?: string;       // CSS-Klasse (z.B. 'btn-primary', 'btn-delete')
  disabled?: boolean;   // Button deaktivieren
  onClick: () => void;  // Click-Handler
}
```

## Beispiele

### 1. Einfache Seite mit Zurück-Button

```typescript
<app-page-header
  [title]="'products.list'"
  [showBackButton]="true"
></app-page-header>
```

### 2. Formular mit Speichern-Action

```typescript
export class ProductFormComponent {
  headerActions: HeaderAction[] = [
    {
      label: 'common.save',
      class: 'btn-save',
      disabled: this.productForm.invalid,
      onClick: () => this.onSubmit()
    }
  ];
}
```

```html
<app-page-header
  [title]="isEditMode ? 'product.edit' : 'product.new'"
  [showBackButton]="true"
  [actions]="headerActions"
></app-page-header>
```

### 3. Liste mit mehreren Actions

```typescript
export class ProductListComponent {
  headerActions: HeaderAction[] = [
    {
      label: 'product.import',
      class: 'btn-secondary',
      icon: '📥',
      onClick: () => this.importProducts()
    },
    {
      label: 'product.create',
      class: 'btn-primary',
      icon: '➕',
      onClick: () => this.createProduct()
    }
  ];
}
```

### 4. Custom Zurück-Navigation

```typescript
<app-page-header
  [title]="'order.detail'"
  [showBackButton]="true"
  [backRoute]="'/admin/orders'"
  (backClick)="handleCustomBack()"
></app-page-header>
```

## Layout-Struktur

```
┌─────────────────────────────────────────────────────────┐
│ Page Header                                             │
│                                                         │
│ ┌───────────────────────────────┐ ┌─────────────────┐ │
│ │ Left Side                     │ │ Right Side      │ │
│ │                               │ │                 │ │
│ │ [← Zurück] Title (Subtitle)   │ │ [Action] [Save] │ │
│ └───────────────────────────────┘ └─────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Responsive Verhalten

#### Desktop (>768px)
- Header horizontal mit Links/Rechts-Layout
- Zurück-Button links, Actions rechts
- Titel zentriert zwischen den Buttons

#### Tablet (≤768px)
- Header vertikal gestapelt
- Elemente linksbündig
- Actions nehmen volle Breite

#### Mobile (≤480px)
- Zurück-Button zeigt nur Icon (←)
- Actions vertikal gestapelt
- Volle Breite für alle Elemente

## Migrationsleitfaden

### Vorher

```typescript
@Component({
  template: `
    <div class="form-header">
      <h1>{{ title }}</h1>
      <button class="btn-back" (click)="goBack()">Zurück</button>
    </div>
  `,
  styles: [`
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .form-header h1 {
      margin: 0;
      color: #333;
      font-size: 1.875rem;
    }
  `]
})
```

### Nachher

```typescript
@Component({
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      [title]="title"
      [showBackButton]="true"
    ></app-page-header>
  `
  // Keine Styles mehr nötig!
})
```

## Bereits migrierte Komponenten

| Komponente | Status | Notizen |
|------------|--------|---------|
| ✅ `category-form.component.ts` | Migriert | Mit headerActions |
| ✅ `product-form.component.ts` | Migriert | Mit headerActions |
| ✅ `cart.component.ts` | Migriert | Mit Custom Back-Text |
| ⏳ `checkout.component.ts` | Geplant | - |
| ⏳ `order-detail.component` | Geplant | - |
| ⏳ `store-settings.component.ts` | Geplant | - |

## Komponenten die migriert werden sollten

### Admin-Bereich
- [ ] `store-list.component.ts`
- [ ] `store-detail.component.ts`
- [ ] `store-settings.component.ts`
- [ ] `orders-professional.component.ts`
- [ ] `order-detail-professional.component.ts`
- [ ] `store-orders.component.ts`
- [ ] `store-reviews-manager.component.ts`
- [ ] `homepage-builder.component.ts`
- [ ] `store-theme.component.ts`
- [ ] `delivery-management.component.ts`

### Storefront
- [ ] `checkout.component.ts`
- [ ] `order-history.component.ts`
- [ ] `address-book.component.ts`

### Settings
- [ ] `theme-customizer.component.ts`
- [ ] `role-management.component.ts`
- [ ] `cj-connect.component.ts`

## Best Practices

### 1. **Konsistente Button-Platzierung**
- ✅ Zurück-Button immer links
- ✅ Action-Buttons immer rechts
- ✅ Wichtigste Action ganz rechts

### 2. **Action-Button-Reihenfolge (rechts nach links)**
```typescript
headerActions = [
  { label: 'Abbrechen', class: 'btn-secondary', ... },    // Links
  { label: 'Vorschau', class: 'btn-secondary', ... },      // Mitte
  { label: 'Speichern', class: 'btn-primary', ... }        // Rechts (wichtigste)
];
```

### 3. **Button-Klassen verwenden**
```typescript
// Verwende die zentralen Button-Klassen aus styles.scss
class: 'btn-primary'    // Hauptaktion
class: 'btn-secondary'  // Sekundäre Aktion
class: 'btn-save'       // Speichern
class: 'btn-delete'     // Löschen
class: 'btn-warning'    // Warnung
```

### 4. **Disabled State**
```typescript
{
  label: 'common.save',
  disabled: !this.form.valid,  // Dynamic disabled
  onClick: () => this.save()
}
```

### 5. **Loading State**
```typescript
{
  label: this.saving ? 'common.saving' : 'common.save',
  disabled: this.saving,
  onClick: () => this.save()
}
```

## Theme-Integration

Die PageHeaderComponent nutzt automatisch die Theme-Variablen:

```scss
--theme-primary       // Button-Farben
--theme-text          // Titel-Farbe
--theme-text-secondary // Untertitel-Farbe
--theme-border        // Border unten
```

## Accessibility (A11Y)

- ✅ Alle Buttons haben `aria-label`
- ✅ Keyboard-Navigation funktioniert
- ✅ Focus-States sind sichtbar
- ✅ Screen-Reader freundlich

## Testing

```typescript
it('should render page header with title', () => {
  const fixture = TestBed.createComponent(PageHeaderComponent);
  fixture.componentInstance.title = 'Test Title';
  fixture.detectChanges();
  
  const title = fixture.nativeElement.querySelector('.page-title');
  expect(title.textContent).toContain('Test Title');
});

it('should emit backClick when back button clicked', () => {
  const fixture = TestBed.createComponent(PageHeaderComponent);
  let clicked = false;
  fixture.componentInstance.backClick.subscribe(() => clicked = true);
  
  const backBtn = fixture.nativeElement.querySelector('.btn-back');
  backBtn.click();
  
  expect(clicked).toBe(true);
});
```

## Vorteile des Systems

1. ✅ **Konsistenz** - Alle Seiten sehen gleich aus
2. ✅ **Wartbarkeit** - Änderungen nur an einer Stelle
3. ✅ **Responsive** - Automatisch für alle Bildschirmgrößen optimiert
4. ✅ **Theme-Support** - Passt sich an Theme-Wechsel an
5. ✅ **Accessibility** - Barrierefrei by default
6. ✅ **DRY** - Keine Code-Duplikation mehr
7. ✅ **Flexibel** - Einfach anpassbar und erweiterbar

## Support & Fragen

Bei Fragen oder Problemen:
1. Siehe Beispiele oben
2. Konsultiere `page-header.component.ts`
3. Teste in verschiedenen Breakpoints

