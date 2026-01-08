<div *ngIf="isLoaded">
        {{ successMessage }}
      </div>
    </div>
  `
})
export class ExampleComponent {
  minChars = 8;
  isLoaded = true;
  successMessage: string;
  
  constructor(private translationService: TranslationService) {
    this.successMessage = this.translationService.translate('messages.operationSuccess');
  }
  
  get currentLang() {
    return this.translationService.currentLang;
  }
  
  toggleLang() {
    this.translationService.toggleLanguage();
    // Nachricht nach Sprachwechsel aktualisieren
    this.successMessage = this.translationService.translate('messages.operationSuccess');
  }
}
```

## ✅ Fertig!

Das i18n-System ist jetzt einsatzbereit. Alle Texte sollten über die Übersetzungsdateien verwaltet werden, nicht mehr inline im Code.
# i18n Translation System mit Arabisch & RTL-Unterstützung - Verwendungsanleitung

## 📁 Dateien-Struktur

```
src/
├── assets/
│   └── i18n/
│       ├── de.json    # Deutsche Übersetzungen
│       ├── en.json    # Englische Übersetzungen
│       └── ar.json    # Arabische Übersetzungen (RTL)
├── app/
│   └── core/
│       ├── services/
│       │   └── translation.service.ts    # Translation Service mit RTL
│       ├── pipes/
│       │   └── translate.pipe.ts          # Translate Pipe
│       └── components/
│           └── language-switcher/
│               └── language-switcher.component.ts
└── styles-rtl.scss    # RTL-spezifische Styles
```

## 🌍 Unterstützte Sprachen

- **Deutsch (DE)** 🇩🇪 - LTR (Left-to-Right)
- **Englisch (EN)** 🇬🇧 - LTR (Left-to-Right)
- **Arabisch (AR)** 🇸🇦 - RTL (Right-to-Left) ⭐

## 🚀 Installation & Setup

### 1. RTL-Styles importieren

Füge die RTL-Styles zu deiner `styles.scss` hinzu:

```scss
// styles.scss
@import 'styles-rtl.scss';

// ...andere Styles
```

### 2. HttpClient bereitstellen

Stelle sicher, dass `HttpClient` in deiner `app.config.ts` verfügbar ist:

```typescript
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // ...andere Providers
  ]
};
```

## 📖 Verwendung

### In Templates (mit Pipe)

```html
<!-- Einfache Übersetzung -->
<h1>{{ 'auth.loginTitle' | translate }}</h1>
<!-- Deutsch: "Anmelden" | English: "Login" | العربية: "تسجيل الدخول" -->

<button>{{ 'common.save' | translate }}</button>
<!-- Deutsch: "Speichern" | English: "Save" | العربية: "حفظ" -->

<!-- Mit Parametern -->
<p>{{ 'validation.minLength' | translate: {min: 5} }}</p>
```

### RTL-Unterstützung prüfen

```typescript
import { TranslationService } from '@core/services/translation.service';

export class MyComponent {
  constructor(private translationService: TranslationService) {
    // Prüfe ob aktuelle Sprache RTL ist
    const isRTL = this.translationService.isRTL();
    console.log('Is RTL:', isRTL); // true für Arabisch
  }
}
```

### Sprache wechseln

```typescript
// Zu Arabisch wechseln
this.translationService.setLanguage('ar');

// Zwischen Sprachen togglen (DE -> EN -> AR -> DE)
this.translationService.toggleLanguage();

// Aktuelle Sprache abrufen
const currentLang = this.translationService.currentLang(); // 'de' | 'en' | 'ar'
```

### Language Switcher verwenden

```typescript
import { LanguageSwitcherComponent } from '@core/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LanguageSwitcherComponent],
  template: `
    <header>
      <nav>
        <!-- Andere Navigation -->
      </nav>
      
      <!-- Sprach-Umschalter mit DE, EN, AR -->
      <app-language-switcher></app-language-switcher>
    </header>
  `
})
export class HeaderComponent {}
```

## 🎨 RTL-Styles anwenden

### Automatische RTL-Anpassung

Das System setzt automatisch `dir="rtl"` auf dem `<html>`-Element, wenn Arabisch gewählt ist:

```html
<!-- Automatisch gesetzt -->
<html dir="rtl" lang="ar">
```

### RTL-spezifische Styles schreiben

```scss
// Automatische Anpassung für alle Elemente
.my-component {
  margin-left: 1rem; // Normal für LTR
}

// Wird automatisch zu margin-right: 1rem für RTL

// Manuelle RTL-Styles (falls nötig)
[dir="rtl"] .my-component {
  // Spezielle Styles nur für RTL
  text-align: right;
}
```

### Utility Classes für RTL

```html
<!-- Nur in RTL anzeigen -->
<div class="rtl-only">
  هذا النص يظهر فقط في الوضع العربي
</div>

<!-- Nur in LTR anzeigen -->
<div class="ltr-only">
  This text only appears in LTR mode
</div>

<!-- Zahlen/Codes bleiben LTR -->
<span class="ltr-text">SKU: 12345</span>
<code class="code">const x = 10;</code>
```

## 📝 Verfügbare Übersetzungs-Keys

### Beispiele in allen Sprachen:

```typescript
// Navigation
'navigation.dashboard'   // DE: "Dashboard" | EN: "Dashboard" | AR: "لوحة التحكم"
'navigation.products'    // DE: "Produkte" | EN: "Products" | AR: "المنتجات"

// Aktionen
'common.save'            // DE: "Speichern" | EN: "Save" | AR: "حفظ"
'common.delete'          // DE: "Löschen" | EN: "Delete" | AR: "حذف"

// Produkte
'product.name'           // DE: "Produktname" | EN: "Product Name" | AR: "اسم المنتج"
'product.price'          // DE: "Preis" | EN: "Price" | AR: "السعر"

// Status
'status.active'          // DE: "Aktiv" | EN: "Active" | AR: "نشط"
'status.pending'         // DE: "Ausstehend" | EN: "Pending" | AR: "قيد الانتظار"
```

## 🎯 Best Practices für RTL

### 1. Verwende logische Properties

```scss
// ❌ Schlecht
.element {
  margin-left: 1rem;
  text-align: left;
}

// ✅ Gut - wird automatisch angepasst
.element {
  margin-inline-start: 1rem;
  text-align: start;
}
```

### 2. Icons richtig ausrichten

```html
<!-- Icons werden automatisch gespiegelt -->
<button>
  <i class="icon-arrow-right icon-flip"></i>
  {{ 'common.next' | translate }}
</button>
```

### 3. Zahlen und Codes immer LTR

```html
<!-- Gut: Zahlen bleiben lesbar -->
<div>
  {{ 'product.price' | translate }}: <span class="ltr-text">€ 99.99</span>
</div>

<div>
  {{ 'product.sku' | translate }}: <code>SKU-12345</code>
</div>
```

### 4. Flex-Container für RTL

```scss
.container {
  display: flex;
  // Wird automatisch zu flex-direction: row-reverse in RTL
}
```

## 🔧 Erweiterte RTL-Features

### Direction-aware Animations

```scss
// Animation passt sich automatisch an
.slide-in {
  animation: slide-in-left 0.3s ease;
}

[dir="rtl"] .slide-in {
  animation: slide-in-right 0.3s ease;
}
```

### Bedingte Anzeige basierend auf RTL

```html
<!-- TypeScript -->
<div *ngIf="translationService.isRTL()">
  <p>هذا المحتوى يظهر فقط في الوضع العربي</p>
</div>

<!-- CSS -->
<div class="rtl-only">Nur für RTL</div>
<div class="ltr-only">Nur für LTR</div>
```

### Gemischter Inhalt (LTR in RTL)

```html
<!-- Arabischer Text mit englischem Produktnamen -->
<div dir="rtl">
  {{ 'product.title' | translate }}: 
  <span class="ltr-text">iPhone 15 Pro</span>
</div>
```

## 🌐 Neue Übersetzungen hinzufügen

### In allen drei Dateien hinzufügen:

**de.json:**
```json
{
  "myFeature": {
    "title": "Mein Feature",
    "save": "Speichern"
  }
}
```

**en.json:**
```json
{
  "myFeature": {
    "title": "My Feature",
    "save": "Save"
  }
}
```

**ar.json:**
```json
{
  "myFeature": {
    "title": "ميزتي",
    "save": "حفظ"
  }
}
```

## 📱 Responsive RTL

```scss
// Responsive mit RTL
.sidebar {
  left: 0;
  
  [dir="rtl"] & {
    left: auto;
    right: 0;
  }
  
  @media (max-width: 768px) {
    // Mobile styles
    [dir="rtl"] & {
      right: 0;
    }
  }
}
```

## 🎨 Arabische Typografie

Die `styles-rtl.scss` enthält bereits optimierte Font-Settings für Arabisch:

```scss
[dir="rtl"] {
  font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
  letter-spacing: normal;
}

[dir="rtl"] h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  letter-spacing: 0;
}
```

## 🚀 Vollständiges Beispiel

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { TranslationService } from '@core/services/translation.service';
import { LanguageSwitcherComponent } from '@core/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-multilingual',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageSwitcherComponent],
  template: `
    <div class="app-header">
      <h1>{{ 'dashboard.welcome' | translate }}</h1>
      
      <app-language-switcher></app-language-switcher>
    </div>
    
    <div class="content">
      <!-- Automatisch RTL wenn Arabisch gewählt -->
      <p>{{ 'product.description' | translate }}</p>
      
      <!-- Preis immer LTR -->
      <div>
        {{ 'product.price' | translate }}: 
        <span class="ltr-text">€ 99.99</span>
      </div>
      
      <!-- Validierung mit Parametern -->
      <div class="error" *ngIf="showError">
        {{ 'validation.minLength' | translate: {min: 8} }}
      </div>
      
      <!-- Buttons passen sich automatisch an -->
      <button (click)="save()">
        {{ 'common.save' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
    }
    
    .content {
      padding: 2rem;
      // Automatisch RTL-aware
    }
    
    // RTL-spezifische Anpassungen
    [dir="rtl"] .content {
      text-align: right;
    }
  `]
})
export class MultilingualComponent {
  showError = false;
  
  constructor(public translationService: TranslationService) {
    console.log('Is RTL:', this.translationService.isRTL());
    console.log('Current Language:', this.translationService.currentLang());
  }
  
  save() {
    const message = this.translationService.translate('messages.operationSuccess');
    alert(message);
  }
}
```

## ✅ Checkliste für RTL-Unterstützung

- ✅ `styles-rtl.scss` importiert
- ✅ Übersetzungen in `ar.json` vorhanden
- ✅ Language Switcher eingebunden
- ✅ Logische Properties verwenden (`start`/`end` statt `left`/`right`)
- ✅ Zahlen und Codes als LTR markieren
- ✅ Icons mit `.icon-flip` spiegeln (wenn nötig)
- ✅ Flexbox mit RTL testen
- ✅ Forms und Inputs auf RTL prüfen
- ✅ Navigation in RTL testen

## 🎉 Fertig!

Das System unterstützt jetzt vollständig Deutsch, Englisch und Arabisch mit automatischer RTL-Anpassung!

**Sprachwechsel erfolgt automatisch durch:**
- Browser-Erkennung
- localStorage-Speicherung
- Manuelle Auswahl im Language Switcher
- `document.dir` wird automatisch auf `rtl` oder `ltr` gesetzt
- Alle Styles passen sich automatisch an
