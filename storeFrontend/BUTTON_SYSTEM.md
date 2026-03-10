# Button System - Zentrale Button-Klassen

## Übersicht
Alle Button-Styles sind zentral in `src/styles.scss` definiert, um Code-Duplikation zu vermeiden.

## Verfügbare Button-Klassen

### 1. Primary Buttons
```html
<button class="btn btn-primary">Speichern</button>
```
- **Farbe**: Theme Primary Color
- **Verwendung**: Hauptaktionen (z.B. Speichern, Erstellen, Kaufen)

### 2. Secondary Buttons
```html
<button class="btn btn-secondary">Abbrechen</button>
```
- **Farbe**: Theme Secondary Color
- **Verwendung**: Sekundäre Aktionen

### 3. Back/Cancel Buttons
```html
<button class="btn btn-back" (click)="goBack()">Zurück</button>
<button class="btn btn-cancel">Abbrechen</button>
```
- **Farbe**: Grau (#6c757d)
- **Verwendung**: Zurück-Navigation, Abbruch von Aktionen

### 4. Success/Save Buttons
```html
<button class="btn btn-save">Speichern</button>
<button class="btn btn-success">Erfolgreich</button>
```
- **Farbe**: Grün (Theme Success)
- **Verwendung**: Erfolgreiche Aktionen, Speichern

### 5. Danger/Delete Buttons
```html
<button class="btn btn-delete">Löschen</button>
<button class="btn btn-danger">Warnung</button>
```
- **Farbe**: Rot (Theme Error)
- **Verwendung**: Destruktive Aktionen, Löschen

### 6. Warning Buttons
```html
<button class="btn btn-warning">Achtung</button>
```
- **Farbe**: Orange (Theme Warning)
- **Verwendung**: Warnungen

## Button-Größen

### Klein
```html
<button class="btn btn-primary btn-sm">Klein</button>
```

### Normal (Standard)
```html
<button class="btn btn-primary">Normal</button>
```

### Groß
```html
<button class="btn btn-primary btn-lg">Groß</button>
```

## Button-Varianten

### Outline (Transparent mit Rahmen)
```html
<button class="btn btn-outline">Outline</button>
```

### Ghost (Komplett transparent)
```html
<button class="btn btn-ghost">Ghost</button>
```

## Kombinationen
Du kannst mehrere Klassen kombinieren:

```html
<!-- Kleiner Primary Button -->
<button class="btn btn-primary btn-sm">Speichern</button>

<!-- Großer Delete Button -->
<button class="btn btn-delete btn-lg">Löschen</button>

<!-- Outline Back Button -->
<button class="btn btn-back btn-outline">Zurück</button>
```

## Custom Overrides in Komponenten

Wenn du in einer Komponente spezifische Anpassungen brauchst, überschreibe nur die notwendigen Properties:

```scss
// In component.scss
.btn-back {
  // Basis-Styles kommen von styles.scss
  // Nur spezifische Overrides hier:
  background: white;
  border: 1px solid #e2e8f0;
  
  &:hover {
    background: #f7fafc;
  }
}
```

## Button States

Alle Buttons unterstützen automatisch:
- **:hover** - Hover-Effekt mit leichtem Lift
- **:active** - Aktiv-Zustand
- **:disabled** - Deaktivierter Zustand (opacity: 0.6)

```html
<button class="btn btn-primary" [disabled]="isLoading">
  Speichern
</button>
```

## Migrationshinweise

### Vorher (Dupliziert in jeder Komponente)
```typescript
styles: [`
  .btn-back {
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
  }
`]
```

### Nachher (Zentral)
```typescript
// Einfach die Klasse verwenden:
template: `<button class="btn btn-back">Zurück</button>`
```

## Theme-Integration

Alle Button-Farben verwenden CSS-Variablen und passen sich automatisch an das gewählte Theme an:

- `--theme-primary`
- `--theme-secondary`
- `--theme-success`
- `--theme-warning`
- `--theme-error`

## Best Practices

1. ✅ **DO**: Verwende die zentralen Klassen
   ```html
   <button class="btn btn-primary">Speichern</button>
   ```

2. ❌ **DON'T**: Definiere keine doppelten Button-Styles in Komponenten
   ```scss
   // Vermeide das:
   .my-button {
     background: #6c757d;
     color: white;
     // ... alle Properties duplizieren
   }
   ```

3. ✅ **DO**: Nutze Kombinationen für spezifische Anwendungsfälle
   ```html
   <button class="btn btn-primary btn-lg">Große Aktion</button>
   ```

4. ✅ **DO**: Überschreibe nur spezifische Properties wenn nötig
   ```scss
   .btn-back {
     background: white; // Override nur diese Property
   }
   ```

