# Responsive Data List Component

## 📋 Übersicht

Die `ResponsiveDataListComponent` ist eine **zentrale, wiederverwendbare Komponente** für die Darstellung von tabellarischen Daten mit automatischer Anpassung an unterschiedliche Bildschirmgrößen:

- **Desktop**: Klassische Tabellen-Ansicht
- **Mobile (< 768px)**: WhatsApp-ähnliche Card/List-Ansicht

## 🎯 Ziel

**Clean Code Prinzipien**:
- ✅ **Single Responsibility**: Eine Komponente für responsive Datendarstellung
- ✅ **DRY**: Keine Duplikation von Tabellen-/Listen-Code mehr
- ✅ **Konfigurierbar**: Flexibel über Inputs anpassbar
- ✅ **Konsistent**: Einheitliches Mobile-Erlebnis in der gesamten App

## 🚀 Verwendung

### 1. Basic Example (Produkte)

```typescript
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

@Component({
  imports: [ResponsiveDataListComponent],
  template: `
    <app-responsive-data-list
      [items]="products"
      [columns]="columns"
      [actions]="actions"
      [loading]="loading"
      emptyMessage="Keine Produkte vorhanden"
      emptyIcon="📦">
    </app-responsive-data-list>
  `
})
export class ProductListComponent {
  products: Product[] = [];
  loading = true;

  // Spalten definieren
  columns: ColumnConfig[] = [
    {
      key: 'primaryImageUrl',
      label: 'Bild',
      type: 'image',
      width: '80px',
      hideOnMobile: true
    },
    {
      key: 'title',
      label: 'Name',
      type: 'text',
      mobileLabel: 'Produkt'
    },
    {
      key: 'basePrice',
      label: 'Preis',
      type: 'currency',
      mobileLabel: 'Preis'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      mobileLabel: 'Status',
      formatFn: (value) => this.getStatusLabel(value),
      badgeClass: (value) => `status-${value.toLowerCase()}`
    }
  ];

  // Actions definieren
  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (item) => this.edit(item)
    },
    {
      icon: '🗑️',
      label: 'Löschen',
      class: 'danger',
      handler: (item) => this.delete(item)
    }
  ];
}
```

## 🔧 API

### Inputs

| Property | Type | Default | Beschreibung |
|----------|------|---------|--------------|
| `items` | `any[]` | `[]` | Die anzuzeigenden Daten |
| `columns` | `ColumnConfig[]` | `[]` | Spalten-Konfiguration |
| `actions` | `ActionConfig[]` | `[]` | Action-Buttons |
| `loading` | `boolean` | `false` | Zeigt Loading-State |
| `emptyMessage` | `string` | `'Keine Einträge vorhanden'` | Nachricht bei leerer Liste |
| `emptyIcon` | `string` | `'📭'` | Icon bei leerer Liste |
| `loadingMessage` | `string` | `'Wird geladen...'` | Loading-Nachricht |
| `actionsLabel` | `string` | `'Aktionen'` | Label für Actions-Spalte |
| `rowClickable` | `boolean` | `false` | Macht Zeilen klickbar |

### Outputs

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `rowClick` | `any` | Emittiert bei Klick auf Zeile (wenn `rowClickable=true`) |

### ColumnConfig

```typescript
interface ColumnConfig {
  key: string;                    // Property-Name im item (unterstützt nested: 'user.email')
  label: string;                  // Desktop-Spalten-Überschrift
  type?: 'text' | 'image' | 'badge' | 'currency' | 'date' | 'custom';
  width?: string;                 // Desktop-Spaltenbreite (z.B. '80px')
  mobileLabel?: string;           // Label für Mobile-Ansicht
  hideOnMobile?: boolean;         // Verstecke auf Mobile
  formatFn?: (value, item) => string;  // Custom Formatter
  badgeClass?: (value, item) => string; // CSS-Klasse für Badges
}
```

### ActionConfig

```typescript
interface ActionConfig {
  icon: string;                   // Emoji oder Icon
  label: string;                  // Aria-Label / Tooltip
  class?: string;                 // CSS-Klasse (z.B. 'danger')
  handler: (item) => void;        // Click-Handler
  visible?: (item) => boolean;    // Optional: Conditional visibility
}
```

## 📱 Responsive Verhalten

### Desktop (> 768px)
- Klassische Tabellen-Darstellung
- Alle Spalten sichtbar
- Hover-Effekte
- Horizontal scrollbar bei Bedarf

### Mobile (≤ 768px)
- WhatsApp-ähnliche Card-Ansicht
- Bild links (wenn vorhanden)
- Informationen rechts als Key-Value-Paare
- Actions unten in der Card
- Spalten mit `hideOnMobile` werden ausgeblendet
- Touch-optimierte Interaktionen

## 🎨 Styling

Die Komponente verwendet globale CSS-Variablen:
- `--theme-primary`
- `--theme-border-radius`
- etc.

### Status-Badge-Klassen (automatisch)

Die Komponente unterstützt automatisch folgende Status-Badge-Klassen:

```scss
.status-active, .status-delivered    // Grün
.status-draft, .status-pending       // Gelb
.status-archived, .status-cancelled  // Rot
.status-processing, .status-confirmed // Blau
.status-shipped                      // Grün (hell)
```

## 📦 Erweiterte Features

### 1. Nested Properties

```typescript
columns: [
  { key: 'user.email', label: 'E-Mail' },
  { key: 'address.city', label: 'Stadt' }
]
```

### 2. Custom Formatter

```typescript
columns: [
  {
    key: 'title',
    label: 'Name',
    formatFn: (value, item) => {
      const star = item.isFeatured ? ' ⭐' : '';
      return value + star;
    }
  }
]
```

### 3. Dynamic Badge Classes

```typescript
columns: [
  {
    key: 'status',
    type: 'badge',
    badgeClass: (value, item) => {
      if (item.urgent) return 'status-urgent';
      return `status-${value.toLowerCase()}`;
    }
  }
]
```

### 4. Conditional Actions

```typescript
actions: [
  {
    icon: '✏️',
    label: 'Bearbeiten',
    handler: (item) => this.edit(item),
    visible: (item) => !item.locked  // Nur sichtbar wenn nicht locked
  }
]
```

### 5. Clickable Rows

```typescript
template: `
  <app-responsive-data-list
    [items]="orders"
    [columns]="columns"
    [rowClickable]="true"
    (rowClick)="viewDetails($event)">
  </app-responsive-data-list>
`

viewDetails(order: Order) {
  this.router.navigate(['/orders', order.id]);
}
```

## 🏗️ Architektur

### Dateien
```
shared/components/responsive-data-list/
├── responsive-data-list.component.ts    (Smart Component)
└── responsive-data-list.component.scss  (Responsive Styles)
```

### Verwendete Komponenten
- ✅ `ProductListComponent`
- ✅ Weitere Listen/Tabellen nach Bedarf

### Pattern
- Standalone Component
- CommonModule
- Input/Output
- Template-driven (keine zusätzlichen Deps)

## 🔄 Migration Bestehender Komponenten

### Vorher (Tabelle mit overflow-x)
```typescript
template: `
  <div class="products-table">
    <table>
      <thead>
        <tr>
          <th>Bild</th>
          <th>Name</th>
          <th>Preis</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let product of products">
          <td>...</td>
          <td>{{ product.title }}</td>
          <td>{{ product.basePrice | currency }}</td>
          <td>
            <button (click)="edit(product)">✏️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
`
```

### Nachher (Responsive Data List)
```typescript
template: `
  <app-responsive-data-list
    [items]="products"
    [columns]="columns"
    [actions]="actions">
  </app-responsive-data-list>
`

columns: ColumnConfig[] = [
  { key: 'primaryImageUrl', label: 'Bild', type: 'image', hideOnMobile: true },
  { key: 'title', label: 'Name', type: 'text' },
  { key: 'basePrice', label: 'Preis', type: 'currency' }
];

actions: ActionConfig[] = [
  { icon: '✏️', label: 'Bearbeiten', handler: (p) => this.edit(p) }
];
```

## ✅ Vorteile

1. **Weniger Code**: ~400 Zeilen Tabellen-Code → ~50 Zeilen Config
2. **Mobile-First**: Automatisch optimiert für alle Bildschirmgrößen
3. **Konsistenz**: Einheitliches Look & Feel
4. **Wartbarkeit**: Änderungen an einer Stelle wirken überall
5. **Testing**: Zentrale Komponente = ein Ort für Tests
6. **Accessibility**: Einmal korrekt implementiert

## 🧪 Testing (TODO)

```typescript
// responsive-data-list.component.spec.ts
describe('ResponsiveDataListComponent', () => {
  it('should render desktop table on large screens', () => {});
  it('should render mobile cards on small screens', () => {});
  it('should execute actions correctly', () => {});
  it('should format values with formatFn', () => {});
  it('should show empty state when items is empty', () => {});
});
```

## 📝 Best Practices

1. **Immer mobileLabel angeben** für wichtige Spalten
2. **hideOnMobile** für unwichtige Spalten (z.B. Bilder)
3. **formatFn** für komplexe Darstellungen
4. **actions** minimal halten (max. 3-4 auf Mobile)
5. **Badge-Klassen** konsistent verwenden

## 🔮 Erweiterungsmöglichkeiten

- [ ] Sortierung
- [ ] Pagination
- [ ] Bulk-Actions (Checkboxen)
- [ ] Search/Filter integriert
- [ ] Export (CSV/Excel)
- [ ] Column Reordering (Drag & Drop)
- [ ] Virtual Scrolling (für große Listen)

---

**Erstellt**: 2026-03-13  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

