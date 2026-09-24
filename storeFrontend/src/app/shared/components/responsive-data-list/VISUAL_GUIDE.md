# 📱 Responsive Data List - Visual Guide

## Desktop View (> 768px)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Products                                                    + New Product  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Bild │ Name         │ Kategorie │ Preis    │ Status  │ Aktionen     │ │
│  ├──────┼──────────────┼───────────┼──────────┼─────────┼──────────────┤ │
│  │ [📷] │ T-Shirt ⭐   │ Clothing  │ 29.99 €  │ ACTIVE  │ ✏️  🗑️      │ │
│  │ [📷] │ Jeans        │ Clothing  │ 79.99 €  │ ACTIVE  │ ✏️  🗑️      │ │
│  │ [📷] │ Sneakers     │ Shoes     │ 89.99 €  │ DRAFT   │ ✏️  🗑️      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Full table layout
- All columns visible
- Hover effects on rows
- Action buttons aligned right
- Professional look

---

## Mobile View (≤ 768px)

```
┌─────────────────────────────┐
│  Products                   │
├─────────────────────────────┤
│  + New Product              │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────────┐│
│  │ [📷]  T-Shirt ⭐        ││
│  │       Produkt: T-Shirt  ││
│  │       Kategorie: Cloth. ││
│  │       Preis: 29.99 €    ││
│  │       Status: ACTIVE    ││
│  │  ─────────────────────  ││
│  │       ✏️  🗑️          ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ [📷]  Jeans             ││
│  │       Produkt: Jeans    ││
│  │       Kategorie: Cloth. ││
│  │       Preis: 79.99 €    ││
│  │       Status: ACTIVE    ││
│  │  ─────────────────────  ││
│  │       ✏️  🗑️          ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

**Features**:
- WhatsApp-ähnliche Cards
- Bild links (70x70px)
- Key-Value-Paare rechts
- Actions unten mit Border
- Touch-optimiert
- Kein horizontales Scrollen!

---

## Vergleich: Vorher vs. Nachher

### ❌ Vorher (Mobile mit overflow-x)

```
┌─────────────────────────────┐
│  Products                   │
├─────────────────────────────┤
│ ←───────────────────────→   │
│ [Scroll horizontal]         │
│                             │
│ Bild│Name│Cat│Pri│Sta│Act  │
│ [📷]│T-Sh│Clo│29.│ACT│✏️🗑️ │
│ [📷]│Jean│Clo│79.│ACT│✏️🗑️ │
└─────────────────────────────┘
```
**Probleme**:
- ❌ Horizontales Scrollen notwendig
- ❌ Schlechte UX auf Mobile
- ❌ Texte abgeschnitten
- ❌ Schwer bedienbar

### ✅ Nachher (Responsive Cards)

```
┌─────────────────────────────┐
│  Products                   │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │ [📷]  T-Shirt           ││
│  │       Kategorie: Cloth. ││
│  │       Preis: 29.99 €    ││
│  │       Status: ACTIVE    ││
│  │  ───────────────────── ││
│  │       ✏️  🗑️          ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```
**Vorteile**:
- ✅ Kein horizontales Scrollen
- ✅ Alle Infos sichtbar
- ✅ Touch-freundlich
- ✅ Moderne UX

---

## Component Architecture

```
ResponsiveDataListComponent
├── Desktop View
│   ├── Table Container
│   │   ├── Table Header (columns)
│   │   └── Table Body (rows)
│   │       ├── Cell Renderer (image, text, badge, currency, date)
│   │       └── Actions Cell
│   └── Responsive: display: block (> 768px)
│
└── Mobile View
    ├── Card List
    │   └── Item Cards
    │       ├── Card Content
    │       │   ├── Image Section (left)
    │       │   └── Info Section (right)
    │       │       └── Field Rows (key-value)
    │       └── Card Actions (bottom)
    └── Responsive: display: block (≤ 768px)
```

---

## Data Flow

```
Parent Component
    │
    ├─→ [items]         : Product[]
    ├─→ [columns]       : ColumnConfig[]
    ├─→ [actions]       : ActionConfig[]
    ├─→ [loading]       : boolean
    └─→ [emptyMessage]  : string
    │
    ▼
ResponsiveDataListComponent
    │
    ├─→ Desktop: Render <table>
    │   └─→ forEach item
    │       ├─→ forEach column
    │       │   └─→ Render cell (type-based)
    │       └─→ Render actions
    │
    └─→ Mobile: Render <cards>
        └─→ forEach item
            ├─→ Render image (if exists)
            ├─→ forEach column (not hideOnMobile)
            │   └─→ Render field (key-value)
            └─→ Render actions
```

---

## Column Types

### 1. Text
```typescript
{ key: 'title', label: 'Name', type: 'text' }
```
**Renders**: Plain text

### 2. Image
```typescript
{ key: 'imageUrl', label: 'Bild', type: 'image', hideOnMobile: true }
```
**Renders**: 
- Desktop: Small thumbnail in table cell
- Mobile: Large image on card left

### 3. Badge
```typescript
{ 
  key: 'status', 
  label: 'Status', 
  type: 'badge',
  badgeClass: (value) => `status-${value.toLowerCase()}`
}
```
**Renders**: Colored badge with status

### 4. Currency
```typescript
{ key: 'price', label: 'Preis', type: 'currency' }
```
**Renders**: `29.99 €`

### 5. Date
```typescript
{ key: 'createdAt', label: 'Datum', type: 'date' }
```
**Renders**: `13.03.2026 14:30`

---

## Action Configuration

### Basic Action
```typescript
{
  icon: '✏️',
  label: 'Bearbeiten',
  handler: (item) => this.edit(item)
}
```

### Styled Action (Danger)
```typescript
{
  icon: '🗑️',
  label: 'Löschen',
  class: 'danger',  // Red border on hover
  handler: (item) => this.delete(item)
}
```

### Conditional Action
```typescript
{
  icon: '🔒',
  label: 'Sperren',
  handler: (item) => this.lock(item),
  visible: (item) => !item.isLocked  // Only show when not locked
}
```

---

## Responsive Breakpoints

```
┌─────────────────────────────────────────────────────────────┐
│  Screen Width     │  View Type  │  Layout                   │
├───────────────────┼─────────────┼───────────────────────────┤
│  > 768px          │  Desktop    │  Full Table               │
│  ≤ 768px          │  Tablet     │  Cards                    │
│  ≤ 480px          │  Mobile     │  Optimized Cards          │
└─────────────────────────────────────────────────────────────┘
```

### 480px Optimizations:
- Image full-width (not left)
- Actions stretch to full width
- Fields stack vertically

---

## Styling Classes

### Desktop Table
```scss
.desktop-table-view          // Container (display: block > 768px)
  └── .table-container       // Overflow wrapper
      └── .data-table        // Actual table
          ├── thead
          │   └── th         // Headers
          └── tbody
              └── tr
                  └── td     // Cells
```

### Mobile Cards
```scss
.mobile-list-view           // Container (display: block ≤ 768px)
  └── .card-list            // Flex column
      └── .item-card        // Individual card
          ├── .card-content
          │   ├── .card-image-section
          │   └── .card-info-section
          │       └── .card-field
          │           ├── .field-label
          │           └── .field-value
          └── .card-actions
```

### Status Badges
```scss
.status-badge               // Base class
.status-active              // Green
.status-draft               // Yellow
.status-cancelled           // Red
.status-processing          // Blue
```

---

## Example Configurations

### Products
```typescript
columns: [
  { key: 'primaryImageUrl', type: 'image', hideOnMobile: true },
  { key: 'title', label: 'Name', mobileLabel: 'Produkt' },
  { key: 'basePrice', label: 'Preis', type: 'currency' },
  { key: 'status', type: 'badge', badgeClass: (v) => `status-${v}` }
]
```

### Orders
```typescript
columns: [
  { key: 'orderNumber', label: 'Nr.', mobileLabel: 'Bestellung' },
  { key: 'customerEmail', label: 'Kunde', mobileLabel: 'E-Mail' },
  { key: 'createdAt', label: 'Datum', type: 'date' },
  { key: 'totalAmount', label: 'Betrag', type: 'currency' },
  { key: 'status', type: 'badge' }
]
```

### Categories
```typescript
columns: [
  { key: 'name', label: 'Name', mobileLabel: 'Kategorie' },
  { key: 'productCount', label: 'Produkte', mobileLabel: 'Anzahl' },
  { 
    key: 'parent.name', 
    label: 'Hauptkategorie',
    formatFn: (value) => value || '-'
  }
]
```

---

## Performance Considerations

### Bundle Size
- Component: ~8KB (gzipped)
- Styles: ~4KB (gzipped)
- **Total**: ~12KB

### Runtime Performance
- No virtual DOM diffing overhead
- Native browser rendering
- CSS-based responsive (no JS)
- Minimal re-renders

### Best Practices
✅ Keep `formatFn` lightweight  
✅ Use `hideOnMobile` for non-essential columns  
✅ Limit actions to 2-3 on mobile  
✅ Avoid nested loops in formatters  

---

## Accessibility

### ARIA Labels
```html
<button [title]="action.label">  <!-- Tooltip -->
  {{ action.icon }}
</button>
```

### Keyboard Navigation
- Tab through action buttons
- Enter to activate
- Arrow keys for table rows

### Screen Readers
- Semantic HTML (`<table>`, `<th>`, `<td>`)
- ARIA attributes on badges
- Alt text on images

---

## Browser Support

✅ Chrome/Edge (Chromium)  
✅ Firefox  
✅ Safari (Desktop + iOS)  
✅ Mobile Chrome  
✅ Mobile Safari  

**IE11**: ❌ Not supported (uses CSS Grid, Flexbox)

---

**Visual Documentation Version**: 1.0  
**Last Updated**: 2026-03-13

