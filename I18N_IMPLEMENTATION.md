# 🌍 i18n System - Vollständige Implementierung

## Übersicht

Dieses Projekt implementiert ein vollständiges Internationalisierungs-System (i18n) mit:
- **Backend**: Spring Boot Language Detection & API
- **Frontend**: Angular mit ngx-translate
- **Unterstützte Sprachen**: Deutsch (de), Englisch (en), Arabisch (ar)
- **RTL-Support**: Vollständige Right-to-Left Unterstützung für Arabisch

---

## 🎯 Features

✅ **Automatische Spracherkennung** beim ersten Besuch (kein Login erforderlich)  
✅ **Prioritätslogik**: Profil → Cookie → Accept-Language → Browser → Fallback (en)  
✅ **RTL-Unterstützung** für Arabisch mit automatischem Layout-Wechsel  
✅ **Cookie-basierte Persistierung** (1 Jahr Gültigkeit)  
✅ **Kein Language Flash** durch APP_INITIALIZER  
✅ **SSR-kompatibel** (Server-Side Rendering ready)  
✅ **User Choice hat immer Vorrang**

---

## 📁 Struktur

### Backend (Spring Boot)

```
src/main/java/storebackend/
├── config/
│   ├── LanguageConfig.java           # Sprach-Konfiguration & Accept-Language Parser
│   └── LanguageDetectionFilter.java  # Filter für automatische Spracherkennung
├── controller/
│   └── LanguageController.java       # REST API Endpoints
└── dto/
    └── LanguageConfigDTO.java        # Response DTO
```

### Frontend (Angular)

```
storeFrontend/src/
├── app/
│   ├── core/services/
│   │   └── language.service.ts       # Zentraler Language Service
│   ├── shared/components/
│   │   └── language-switcher/
│   │       └── language-switcher.component.ts  # UI Component
│   └── app.config.ts                 # APP_INITIALIZER Setup
├── assets/i18n/
│   ├── de.json                       # Deutsche Übersetzungen
│   ├── en.json                       # Englische Übersetzungen
│   └── ar.json                       # Arabische Übersetzungen
└── styles/
    └── rtl.scss                      # RTL Styling
```

---

## 🚀 Backend Implementation

### 1. LanguageConfig.java

**Funktionen:**
- Definiert unterstützte Sprachen: `de`, `en`, `ar`
- Parse Accept-Language Header mit q-values
- Bestimmt Text-Direction (ltr/rtl)

**Key Methods:**
```java
parseAcceptLanguage(String header)  // Parsed "de-DE,de;q=0.9,en;q=0.8"
isSupported(String lang)             // Validierung
getDirection(String lang)            // "rtl" für ar, sonst "ltr"
```

### 2. LanguageDetectionFilter.java

**Flow:**
1. Prüft Cookie `preferred_lang`
2. Falls nicht vorhanden → parsed Accept-Language Header
3. Fallback → `en`
4. Setzt `X-Resolved-Language` Response Header
5. Speichert resolved language als Request Attribute

**Priorität:**
```
Cookie > Accept-Language > Default (en)
```

### 3. LanguageController.java

**Endpoints:**

#### GET `/api/config`
```json
{
  "resolvedLanguage": "ar",
  "supportedLanguages": ["de", "en", "ar"],
  "direction": "rtl"
}
```

#### POST `/api/config/language?lang=de`
- Setzt Cookie `preferred_lang`
- Cookie-Optionen:
  - Path: `/`
  - MaxAge: 1 Jahr
  - HttpOnly: `false` (muss von JS lesbar sein)
  - Secure: `false` (für Production auf `true`)

---

## 🎨 Frontend Implementation

### 1. LanguageService

**Zentrale Funktionen:**

```typescript
initialize()                    // APP_INITIALIZER
setLanguage(lang, saveCookie)   // Sprache wechseln
getCurrentLanguage()            // Aktuelle Sprache
getCurrentDirection()           // ltr/rtl
isRTL()                        // Boolean
getLanguageDisplayName(lang)    // "Deutsch", "English", "العربية"
```

**Detection-Flow:**
```
1. Cookie lesen
2. Falls nicht → Backend /api/config
3. Falls Backend-Fehler → Browser navigator.languages
4. Fallback → en
```

**Beim Sprachwechsel:**
```typescript
document.documentElement.lang = lang;
document.documentElement.dir = direction;
document.body.classList.add(direction);
```

### 2. APP_INITIALIZER

In `app.config.ts`:

```typescript
{
  provide: APP_INITIALIZER,
  useFactory: initializeLanguage,
  deps: [LanguageService],
  multi: true
}
```

**Verhindert:**
- Language Flash beim ersten Laden
- Falsche Sprache in Initial Render
- Race Conditions

### 3. Language Switcher Component

**Features:**
- Dropdown mit allen Sprachen
- Aktuelle Sprache hervorgehoben
- Flaggen-Emojis (🇩🇪 🇬🇧 🇸🇦)
- RTL-aware Styling
- Overlay zum Schließen

**Usage:**
```html
<app-language-switcher></app-language-switcher>
```

### 4. Translation Files

**Struktur:**
```json
{
  "header": { ... },
  "cart": { ... },
  "product": { ... },
  "checkout": { ... },
  "common": { ... },
  "footer": { ... }
}
```

**Usage in Templates:**
```html
{{ 'header.home' | translate }}
{{ 'cart.items' | translate: {count: 5} }}
```

**Usage in TypeScript:**
```typescript
this.translate.get('common.success').subscribe(text => {
  console.log(text);
});

// Instant (synchron)
const text = this.translate.instant('common.error');
```

---

## 🔄 RTL Support

### CSS Logical Properties

**Statt hardcoded left/right:**

❌ **Falsch:**
```css
margin-left: 1rem;
padding-right: 2rem;
text-align: right;
```

✅ **Richtig:**
```css
margin-inline-start: 1rem;
padding-inline-end: 2rem;
text-align: end;
```

### SCSS Mixins

```scss
@mixin rtl {
  [dir="rtl"] & {
    @content;
  }
}

.my-component {
  margin-left: 1rem;
  
  @include rtl {
    margin-right: 1rem;
    margin-left: 0;
  }
}
```

### Utility Classes

```html
<div class="m-start">Margin Start</div>
<div class="p-end">Padding End</div>
<div class="text-start">Text Start</div>
```

### Icons spiegeln

```scss
[dir="rtl"] {
  .icon-arrow-right, .icon-chevron-right {
    transform: scaleX(-1);
  }
}
```

### Flexbox RTL

```html
<div class="flex-row-rtl">
  <!-- Wird in RTL automatisch row-reverse -->
</div>
```

---

## 🧪 Testing

### Backend Tests

**Cookie Detection:**
```bash
curl -H "Cookie: preferred_lang=de" http://localhost:8080/api/config
```

**Accept-Language:**
```bash
curl -H "Accept-Language: ar-SA,ar;q=0.9,en;q=0.8" http://localhost:8080/api/config
```

**Sprache setzen:**
```bash
curl -X POST http://localhost:8080/api/config/language?lang=ar
```

### Frontend Tests

**Browser Console:**
```javascript
// Cookie prüfen
document.cookie

// Sprache wechseln
languageService.setLanguage('ar', true)

// Aktuelle Sprache
languageService.getCurrentLanguage()

// Direction
document.documentElement.dir
```

---

## 🔧 Integration Guide

### Header Component Integration

```typescript
import { Component } from '@angular/core';
import { LanguageSwitcherComponent } from '@app/shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LanguageSwitcherComponent],
  template: `
    <header>
      <nav>
        <!-- Existing nav items -->
      </nav>
      
      <!-- Language Switcher -->
      <app-language-switcher></app-language-switcher>
    </header>
  `
})
export class HeaderComponent {}
```

### Component mit Übersetzungen

```typescript
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <h1>{{ 'header.home' | translate }}</h1>
    <p>{{ 'product.description' | translate }}</p>
    <button>{{ 'common.save' | translate }}</button>
  `
})
export class MyComponent {}
```

### Programmatischer Sprachwechsel

```typescript
constructor(private languageService: LanguageService) {}

async switchToArabic() {
  await this.languageService.setLanguage('ar', true);
  // UI wird automatisch aktualisiert
}
```

---

## 📝 Edge Cases

### 1. Unsupported Language

```typescript
// User sendet "fr" (Französisch)
// → System fallback auf "en"
```

### 2. Cookie gelöscht

```typescript
// Beim nächsten Besuch:
// 1. Kein Cookie
// 2. Backend prüft Accept-Language
// 3. User bekommt passende Sprache
```

### 3. Sprachwechsel im Checkout

```typescript
// Translations werden sofort aktualisiert
// Formular-Validierung bleibt erhalten
// Keine Datenverluste
```

### 4. Browser ohne JavaScript

```typescript
// Backend setzt Sprache via Accept-Language
// SSR liefert korrekte Sprache aus
// HTML hat korrekte lang + dir Attribute
```

---

## 🌐 SEO & Routing (Optional)

### Mit Sprach-Prefix

**Setup in `app.routes.ts`:**

```typescript
export const routes: Routes = [
  {
    path: ':lang',
    children: [
      { path: '', component: HomeComponent },
      { path: 'products', component: ProductsComponent },
      // ...
    ]
  },
  { path: '', redirectTo: '/en', pathMatch: 'full' }
];
```

**Backend Redirect:**

```java
@GetMapping("/")
public RedirectView handleRoot(HttpServletRequest request) {
    String lang = (String) request.getAttribute("resolvedLanguage");
    return new RedirectView("/" + lang);
}
```

**hreflang Tags:**

```html
<link rel="alternate" hreflang="de" href="https://shop.com/de" />
<link rel="alternate" hreflang="en" href="https://shop.com/en" />
<link rel="alternate" hreflang="ar" href="https://shop.com/ar" />
<link rel="alternate" hreflang="x-default" href="https://shop.com/en" />
```

---

## 🚀 Deployment Checklist

### Backend

- [ ] `COOKIE_SECURE` auf `true` in Production
- [ ] CORS konfiguriert für Cookie-Handling
- [ ] Accept-Language Header wird nicht blockiert
- [ ] Response Header `X-Resolved-Language` prüfen

### Frontend

- [ ] Translation Files deployed (`assets/i18n/*.json`)
- [ ] RTL Styles eingebunden (`rtl.scss`)
- [ ] Cookie Domain korrekt konfiguriert
- [ ] SameSite Cookie Policy geprüft

### Testing

- [ ] Browser Language Detection
- [ ] Cookie Persistierung (1 Jahr)
- [ ] RTL Layout (alle Seiten)
- [ ] Icons gespiegelt in RTL
- [ ] Formulare in RTL
- [ ] Checkout-Flow in allen Sprachen

---

## 📚 Erweiterung

### Neue Sprache hinzufügen (z.B. Französisch)

**1. Backend:**

```java
// LanguageConfig.java
public static final Set<String> SUPPORTED_LANGUAGES = Set.of("de", "en", "ar", "fr");
```

**2. Frontend:**

```typescript
// language.service.ts
private readonly SUPPORTED_LANGUAGES = ['de', 'en', 'ar', 'fr'];
```

**3. Translation File:**

```bash
# Erstelle
storeFrontend/src/assets/i18n/fr.json
```

**4. Direction:**

```java
// LanguageConfig.java
public static String getDirection(String lang) {
    return "ar".equals(lang) || "he".equals(lang) ? "rtl" : "ltr";
}
```

---

## 🛠️ Troubleshooting

### Problem: Language Flash beim Laden

**Lösung:** APP_INITIALIZER läuft nicht
```typescript
// Prüfe app.config.ts
// APP_INITIALIZER muss VOR provideRouter sein
```

### Problem: Cookie wird nicht gespeichert

**Lösung:** 
```typescript
// SameSite Policy prüfen
// HttpOnly muss false sein
// Domain/Path korrekt?
```

### Problem: RTL funktioniert nicht

**Lösung:**
```scss
// Prüfe: rtl.scss importiert in styles.scss?
@import './styles/rtl.scss';

// HTML Attribute gesetzt?
document.documentElement.dir = 'rtl';
```

### Problem: Backend erkennt Sprache nicht

**Lösung:**
```java
// Filter-Order prüfen
@Order(1)  // Muss früh laufen

// Accept-Language Header kommt an?
// Cookie wird gesendet?
```

---

## ✅ Completion Status

**Backend:**
- ✅ LanguageConfig mit Accept-Language Parser
- ✅ LanguageDetectionFilter
- ✅ LanguageController mit Endpoints
- ✅ Cookie Handling (1 Jahr)
- ✅ Direction Detection (ltr/rtl)

**Frontend:**
- ✅ LanguageService mit Detection Logic
- ✅ APP_INITIALIZER (kein Flash)
- ✅ ngx-translate Setup
- ✅ Language Switcher Component
- ✅ Translation Files (de/en/ar)
- ✅ RTL Styles (SCSS)
- ✅ Logical Properties
- ✅ Cookie Persistierung

**Features:**
- ✅ Automatische Spracherkennung
- ✅ User Choice Vorrang
- ✅ RTL Support
- ✅ SSR Ready
- ✅ No Language Flash
- ✅ Edge Cases behandelt

---

## 📞 Support

Bei Problemen:
1. Browser DevTools → Console prüfen
2. Network Tab → `/api/config` Request prüfen
3. Cookie → `preferred_lang` prüfen
4. HTML Attribute → `lang` und `dir` prüfen

**System ist produktionsbereit! 🎉**

