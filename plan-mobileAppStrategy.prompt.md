# Plan: Mobile App Strategy – markt.ma (Android + iOS)
## Aktueller Stand: Analyse + Verfeinerter Umsetzungsplan

> Letzte Analyse: Mai 2026 | Angular 17 | Standalone Components | ngx-translate | 50+ Services

---

## Ist-Zustand (aus Code-Analyse)

### Was bereits existiert ✅
- **Angular 17** mit Standalone Components – kein NgModule
- **ngx-translate** (`@ngx-translate/core ^17`) bereits installiert
- **de.json, en.json, ar.json** vollständig unter `src/assets/i18n/`
- **RTL-Support** via `[dir="rtl"]` in SCSS (`:host-context([dir="rtl"])`)
- **`safe-area-inset-bottom`** bereits in `storefront-landing.component.scss` vorhanden (1 Stelle)
- **WhatsApp-Widget** (`whatsapp-widget.component.ts`) vollständig implementiert
- **Footer** in `storefront-landing.component.html` mit Social Links, Kontakt, `footer.poweredBy`
- **`storefront-header.component.ts`** mit Language Selector, Login, Cart, User-Menu
- **SubdomainService** mit `window.location.hostname`-Logik (kritisch für Mobile!)
- **50+ Services** in `core/services/` – vollständig wiederverwendbar
- **Auth-Interceptor** + **Error-Interceptor** vorhanden
- **`app.component.ts`** steuert `showAdminShell` + `showWidgets` via URL-Pattern

### Was noch FEHLT ❌
- **Kein `manifest.webmanifest`** (PWA-Installierbarkeit nicht möglich)
- **Kein `ngsw-config.json`** (kein Service Worker, kein Offline)
- **Kein `capacitor.config.ts`** (noch nicht initialisiert)
- **Kein `@angular/pwa`** in dependencies
- **Kein `theme-color` Meta-Tag** in `index.html`
- **Kein `apple-touch-icon`** in `index.html`
- **Bottom Navigation** für Storefront fehlt (nur Desktop-Header)
- **PlatformService** fehlt (Unterscheidung Web vs. Native)
- **Keyboard-Handling** fehlt (Inputs werden auf Mobile verdeckt)
- **Mobile Kategorie-Navigation** fehlt (Kategorien nur im Sidebar/Desktop-Layout)

---

## Strategie: Zweistufig

```
Phase 1: PWA (Quick-Win, ~1-2 Tage)
Phase 2: Capacitor (Native App, ~1-2 Wochen)
```

Beide Phasen nutzen **exakt denselben Angular-Code** – kein Fork, kein Rewrite.

---

## Phase 1: PWA

### Schritt 1.1 – `index.html` erweitern

**Datei:** `storeFrontend/src/index.html`

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>markt.ma - Multi-Tenant E-Commerce Platform</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <!-- PWA / Mobile -->
  <meta name="theme-color" content="#667eea">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="markt.ma">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="assets/icons/icon-192x192.png">

  <!-- Favicon + Fonts (bestehend) -->
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,...">
  <link href="assets/fonts/material-icons.css" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

> **Wichtig:** `viewport-fit=cover` aktiviert Safe-Area-Unterstützung für iPhone Notch/Home-Indicator.

---

### Schritt 1.2 – `manifest.webmanifest` erstellen

**Datei:** `storeFrontend/src/manifest.webmanifest` (NEU)

```json
{
  "name": "markt.ma – Online Shops",
  "short_name": "markt.ma",
  "description": "Marokkanische Online-Shops entdecken und einkaufen",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "lang": "de",
  "dir": "ltr",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "assets/icons/icon-72x72.png",   "sizes": "72x72",   "type": "image/png" },
    { "src": "assets/icons/icon-96x96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "assets/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "assets/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable any" },
    { "src": "assets/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
  ],
  "categories": ["shopping", "lifestyle"],
  "screenshots": [
    { "src": "assets/screenshots/mobile-home.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

> **Hinweis:** Icons müssen unter `src/assets/icons/` angelegt werden (PNG, quadratisch).
> **RTL-Variante**: Für arabische Nutzer würde `"dir": "rtl"` und `"lang": "ar"` gelten.
> Aktuell: eine einzige Manifest-Datei, Sprache wird zur Laufzeit durch `TranslationService` gesteuert.

---

### Schritt 1.3 – Service Worker (ngsw-config.json)

**Installation:**
```bash
cd storeFrontend
ng add @angular/pwa --project markt-ma-frontend
```

Dieser Befehl:
1. Installiert `@angular/service-worker`
2. Erstellt `ngsw-config.json`
3. Aktualisiert `angular.json` mit `serviceWorker: true`
4. Aktualisiert `app.config.ts` mit `provideServiceWorker()`

**Angepasste `ngsw-config.json`** (nach Installation bearbeiten):

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|jpeg|png|webp|gif|otf|ttf|woff|woff2|ani|eot)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-translations",
      "urls": ["/assets/i18n/*.json"],
      "cacheConfig": { "maxSize": 10, "maxAge": "7d", "strategy": "freshness" }
    },
    {
      "name": "api-store",
      "urls": ["https://api.markt.ma/api/public/**"],
      "cacheConfig": { "maxSize": 50, "maxAge": "1h", "strategy": "freshness" }
    }
  ]
}
```

> **Kritisch:** Service Worker NUR im Production Build aktiv (`ng build --configuration production`).
> Im Development (`ng serve`) ist er deaktiviert – kein Cache-Problem.

---

### Schritt 1.4 – Safe-Area global erweitern

**Datei:** `storeFrontend/src/styles.scss` (globale Styles)

```scss
/* ============================================
   Safe-Area – iPhone Notch / Home-Indicator
   ============================================ */
:root {
  --safe-area-top:    env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left:   env(safe-area-inset-left, 0px);
  --safe-area-right:  env(safe-area-inset-right, 0px);
}

/* WhatsApp + Chatbot Widget: über Home-Indicator */
app-whatsapp-widget,
app-chatbot-widget {
  .wa-btn,
  .chatbot-fab {
    bottom: calc(2rem + var(--safe-area-bottom));
  }
}

/* Footer: Nicht vom Home-Indicator verdeckt */
.storefront-footer {
  padding-bottom: calc(1.5rem + var(--safe-area-bottom));
}

/* Bottom Navigation (Phase 2): Home-Indicator-Abstand */
.bottom-nav {
  padding-bottom: var(--safe-area-bottom);
}
```

> Die bestehende `env(safe-area-inset-bottom, 0px)` in `storefront-landing.component.scss`
> bleibt unverändert – sie ist bereits korrekt. Die globale Variable vereinheitlicht es.

---

### Schritt 1.5 – `angular.json` Assets aktualisieren

In `angular.json` unter `projects.markt-ma-frontend.architect.build.options.assets`:

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/manifest.webmanifest"
]
```

---

## Phase 2: Capacitor (Native App)

### Schritt 2.1 – PlatformService erstellen (KRITISCH)

**Datei:** `storeFrontend/src/app/core/services/platform.service.ts` (NEU)

```typescript
import { Injectable } from '@angular/core';

/**
 * Abstrahiert Web vs. Native (Capacitor) Kontext.
 * MUSS überall statt direktem window.location.hostname verwendet werden.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  /** true = Capacitor Native App (iOS/Android), false = Web Browser */
  readonly isNative: boolean = this.detectCapacitor();

  /** true = auf einem mobilen Gerät (beliebig – Web oder Native) */
  readonly isMobile: boolean = this.detectMobile();

  /** true = RTL-Sprache aktiv */
  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  private detectCapacitor(): boolean {
    return typeof (window as any).Capacitor !== 'undefined' &&
           (window as any).Capacitor.isNativePlatform?.() === true;
  }

  private detectMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  }

  /** Gibt die echte Hostname-Logik zurück – im Native-Kontext immer 'localhost' → kein Subdomain */
  getHostname(): string {
    return window.location.hostname;
  }

  /** Gibt an ob wir auf einer Storefront-Subdomain sind (nur Web) */
  isStorefrontSubdomain(): boolean {
    if (this.isNative) return false; // Im App-Kontext nie Subdomain
    const hostname = this.getHostname();
    return hostname.endsWith('.markt.ma') &&
           hostname !== 'markt.ma' &&
           hostname !== 'www.markt.ma' &&
           hostname !== 'api.markt.ma';
  }
}
```

---

### Schritt 2.2 – SubdomainService anpassen (KRITISCH)

**Datei:** `storeFrontend/src/app/core/services/subdomain.service.ts`

**Problem:** `detectSubdomain()` liest `window.location.hostname` direkt.
Im Capacitor-Kontext ist das immer `localhost` → SubdomainService erkennt keine Subdomain → Storefront-Landing wird nie geladen.

**Lösung:** `PlatformService` injizieren, Native-Pfad abfangen:

```typescript
// In detectSubdomain() am Anfang ergänzen:
constructor(private http: HttpClient, private platform: PlatformService) {}

detectSubdomain(): SubdomainInfo {
  if (this.subdomainInfo) return this.subdomainInfo;

  // NATIVE: Kein Subdomain-Check möglich → immer isSubdomain: false
  // Store-Auswahl läuft über Route-Parameter (/s/:storeSlug)
  if (this.platform.isNative) {
    this.subdomainInfo = {
      isSubdomain: false, subdomain: null,
      storeId: null, storeName: null, slug: null
    };
    return this.subdomainInfo;
  }

  // ... restlicher bestehender Code bleibt unverändert ...
}
```

---

### Schritt 2.3 – Native Store-Route für App

**Problem:** Im Browser öffnet `nike.markt.ma` den Nike-Store.
Im App gibt es keine Subdomains → Store-Auswahl braucht eine Alternative.

**Lösung: Store-Discovery-Route** `/s/:slug` hinzufügen in `app.routes.ts`:

```typescript
// In app.routes.ts ergänzen (vor der '' root route):
{
  path: 's/:slug',
  loadComponent: () =>
    import('./features/storefront/storefront-landing.component')
      .then(m => m.StorefrontLandingComponent)
},
```

`StorefrontLandingComponent` muss dann Route-Param `slug` auslesen
**wenn** kein Subdomain erkannt wurde (Native-Kontext):

```typescript
// In storefront-landing.component.ts ngOnInit ergänzen:
const routeSlug = this.route.snapshot.paramMap.get('slug');
const subdomainInfo = this.subdomainService.detectSubdomain();

const slug = subdomainInfo.slug ?? routeSlug;
// Dann mit slug weiterarbeiten wie bisher mit subdomainInfo.slug
```

---

### Schritt 2.4 – Bottom Navigation für Storefront (Mobile UX)

**Datei:** `storeFrontend/src/app/features/storefront/storefront-bottom-nav.component.ts` (NEU)

Diese Komponente wird NUR auf Mobile angezeigt (via CSS `@media (max-width: 767px)`).
Sie ergänzt den Desktop-Header auf Mobile.

```typescript
@Component({
  selector: 'app-storefront-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <nav class="bottom-nav" [class.rtl]="isRtl" role="navigation" aria-label="Hauptnavigation">
      <a class="nav-item" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">{{ 'navigation.overview' | translate }}</span>
      </a>
      <a class="nav-item" [routerLink]="['/s', storeSlug, 'categories']" routerLinkActive="active">
        <span class="nav-icon">📂</span>
        <span class="nav-label">{{ 'navigation.categories' | translate }}</span>
      </a>
      <a class="nav-item" [routerLink]="['/s', storeSlug, 'cart']" routerLinkActive="active">
        <span class="nav-icon">🛒</span>
        <span class="nav-label">{{ 'cart.title' | translate }}</span>
        <span class="nav-badge" *ngIf="cartCount > 0">{{ cartCount }}</span>
      </a>
      <a class="nav-item" [routerLink]="['/s', storeSlug, 'profile']" routerLinkActive="active">
        <span class="nav-icon">👤</span>
        <span class="nav-label">{{ 'navigation.myAccount' | translate }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav { display: none; }

    @media (max-width: 767px) {
      .bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 1000;
        background: #fff;
        border-top: 1px solid #e5e7eb;
        padding: 8px 0;
        padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -2px 10px rgba(0,0,0,0.08);
      }
      .nav-item {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; gap: 2px; text-decoration: none;
        color: #6b7280; font-size: 11px; padding: 4px 0;
        position: relative; transition: color 0.15s;
      }
      .nav-item.active { color: #667eea; }
      .nav-item.active .nav-icon { transform: scale(1.15); }
      .nav-icon { font-size: 22px; transition: transform 0.15s; }
      .nav-label { font-size: 10px; font-weight: 500; }
      .nav-badge {
        position: absolute; top: 2px; right: calc(50% - 18px);
        background: #ef4444; color: #fff; font-size: 10px;
        font-weight: 700; min-width: 16px; height: 16px;
        border-radius: 8px; display: flex; align-items: center;
        justify-content: center; padding: 0 4px;
      }
      .rtl .nav-badge { right: auto; left: calc(50% - 18px); }
    }
  `]
})
export class StorefrontBottomNavComponent {
  @Input() storeSlug = '';
  @Input() cartCount = 0;
  get isRtl() { return document.documentElement.dir === 'rtl'; }
}
```

---

### Schritt 2.5 – Footer-Erreichbarkeit auf Mobile sichern

**Problem:** Auf Mobile mit Bottom-Nav wird der Footer vom Bottom-Nav verdeckt.

**Lösung:** In `storefront-landing.component.scss` ergänzen:

```scss
@media (max-width: 767px) {
  .storefront-footer {
    /* Abstand für Bottom Navigation (56px) + Safe Area */
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 1.5rem);
  }
  .storefront-wrapper {
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }
}
```

---

### Schritt 2.6 – Capacitor initialisieren

```bash
cd storeFrontend
npm install @capacitor/core @capacitor/cli
npx cap init "markt.ma" "ma.markt.app" --web-dir=dist/markt-ma-frontend/browser
npm install @capacitor/android && npx cap add android
# iOS nur auf macOS:
npm install @capacitor/ios && npx cap add ios
```

**`capacitor.config.ts`:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'ma.markt.app',
  appName: 'markt.ma',
  webDir: 'dist/markt-ma-frontend/browser',
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#667eea', showSpinner: false }
  }
};
export default config;
```

---

### Schritt 2.7 – Auth: localStorage → SecureStorage

```bash
npm install @capacitor-community/secure-storage && npx cap sync
```

In `auth.service.ts` Storage-Calls über `PlatformService` abstrahieren:

```typescript
// Statt: localStorage.setItem('jwt_token', token)
if (this.platform.isNative) {
  // SecureStorage (iOS Keychain / Android Keystore)
  const { SecureStorage } = await import('@capacitor-community/secure-storage');
  await SecureStorage.set({ key: 'jwt_token', value: token });
} else {
  localStorage.setItem('jwt_token', token);
}
```

---

## i18n – Mobile Keys ergänzen (de.json / en.json / ar.json)

```json
// de.json:
"mobile": {
  "installApp": "App installieren",
  "installPrompt": "Für ein besseres Erlebnis als App speichern",
  "installBtn": "Installieren",
  "later": "Später",
  "offlineMode": "Offline-Modus – begrenzte Funktionen",
  "updateAvailable": "Update verfügbar",
  "updateNow": "Jetzt aktualisieren"
}

// ar.json:
"mobile": {
  "installApp": "تثبيت التطبيق",
  "installPrompt": "احفظ التطبيق لتجربة أفضل",
  "installBtn": "تثبيت",
  "later": "لاحقاً",
  "offlineMode": "وضع عدم الاتصال – وظائف محدودة",
  "updateAvailable": "تحديث متاح",
  "updateNow": "تحديث الآن"
}

// en.json:
"mobile": {
  "installApp": "Install App",
  "installPrompt": "Save as app for a better experience",
  "installBtn": "Install",
  "later": "Later",
  "offlineMode": "Offline mode – limited features",
  "updateAvailable": "Update available",
  "updateNow": "Update now"
}
```

---

## Kritische Probleme & Lösungen

| Problem | Betroffene Datei | Status | Lösung |
|---|---|---|---|
| `window.location.hostname` Subdomain-Check | `app.routes.ts` Z.355+389 | ❌ Bricht Native | `PlatformService.isStorefrontSubdomain()` |
| `window.location.hostname` in SubdomainService | `subdomain.service.ts` Z.67 | ❌ Bricht Native | `PlatformService` injizieren |
| Kein Manifest | `index.html` | ❌ Kein PWA | Schritt 1.1 + 1.2 |
| Kein Safe-Area global | `styles.scss` | ⚠️ Partiell | Schritt 1.4 |
| Footer verdeckt durch Bottom-Nav | `storefront-footer` | ⚠️ UX-Problem | Schritt 2.5 |
| `localStorage` JWT | `auth.service.ts` | ⚠️ Sicherheit | Schritt 2.7 |
| Meta Pixel `fbq()` | `meta-pixel.service.ts` | ⚠️ Native no-op | Guard mit `PlatformService.isNative` |
| iframe Preview (`sp-mobile-iframe`) | `app.component.ts` Z.138 | ⚠️ iOS WKWebView | Für isNative ausblenden |
| Bottom-Nav fehlt | Storefront | ❌ UX Mobile | Schritt 2.4 |
| Kategorie-Navigation Mobile | Storefront | ❌ UX Mobile | Horizontales Scroll-Strip (Phase 2) |

---

## Reihenfolge nach ROI

| Priorität | Schritt | Aufwand | Impact |
|---|---|---|---|
| 1 | `index.html` viewport-fit + theme-color | 5 min | Sofort sichtbar auf Mobile |
| 2 | Icons erstellen (72/96/128/192/512px PNG) | 1h | PWA-Installierbarkeit |
| 3 | `manifest.webmanifest` erstellen | 30 min | PWA installierbar |
| 4 | Safe-Area global in `styles.scss` | 30 min | iPhone Notch-Fix |
| 5 | Footer-Erreichbarkeit Mobile | 30 min | UX-Blockade behoben |
| 6 | `angular.json` Assets + manifest | 10 min | Build-Integration |
| 7 | `ng add @angular/pwa` | 2h | Offline + Service Worker |
| 8 | i18n mobile Keys (de/en/ar) | 30 min | Vollständige i18n |
| 9 | `PlatformService` erstellen | 1h | Basis für Native |
| 10 | Bottom Navigation Storefront | 3h | Mobile UX massiv besser |
| 11 | `/s/:slug` Route in app.routes.ts | 1h | Native Store-Öffnung |
| 12 | `SubdomainService` PlatformService | 2h | Native-Routing funktioniert |
| 13 | Capacitor initialisieren + Android-Build | 4h | Erste Native-App |
| 14 | SecureStorage für JWT | 3h | App Store Compliance |
| 15 | iOS-Build + TestFlight | 1 Tag | iOS Testing |
| 16 | Push Notifications (FCM/APNs) | 2-3 Tage | Phase 2 Feature |

---

## Nicht anfassen / Risiken

- **`storefront-landing.component.ts`** – Kern, nur minimal erweitern (Route-Param)
- **`app.routes.ts` Root + Wildcard** – `window.location.hostname` bleibt für Web
- **`translation.service.ts`** – Nicht anfassen
- **`admin-sidebar.component.ts`** – Nur Desktop, kein Mobile-Scope
- **`whatsapp-widget.component.ts`** – Vollständig, nur Safe-Area CSS ergänzen
- **`chatbot-widget.component.ts`** – Vollständig, nur Safe-Area CSS ergänzen

---

## ORIGINAL PLAN (Ersetzt durch obige Analyse)

Das bestehende Angular 17 SaaS ist bereits gut strukturiert (50+ Services, Standalone Components, JWT, i18n). Die empfohlene Strategie ist **zweistufig**: zuerst **PWA** als Quick-Win, dann **Capacitor** als nativer Wrapper – ohne das Backend oder die bestehende Angular-Architektur umzubauen.

---

## 1. Technologieentscheidung

**Empfehlung: Capacitor + Angular (mit PWA als Vorstufe)**

| Technologie | Für unser System | Gegen unser System |
|---|---|---|
| **PWA** Quick-Win | Kein Rewrite, funktioniert sofort, Angular CLI `@angular/pwa` | Kein App Store, limitierte Native-APIs, kein Offline-Cart |
| **Capacitor** Empfohlen | Wraps existing Angular Build 1:1, alle 50+ Services, Models, Components wiederverwendbar, iOS + Android | Subdomain-Logik muss angepasst werden, localStorage → SecureStorage |
| **Ionic + Angular** | UI-Komponenten, mobile Gesten ready | Redesign aller UI-Komponenten nötig, aufwendige Migration |
| **React Native** | Performance | Kompletter Rewrite, alle Services, Templates, i18n neu |
| **Flutter** | Performance + Design | Vollständiger Neubau, kein Code-Reuse |
| **WebView Wrapper** | Schnellste Lösung | Kein echter Native-Feeling, App Store Rejection-Risiko hoch |

---

## 2. Was kann 1:1 wiederverwendet werden

- **Alle 50+ Services** in `/core/services/` – `AuthService`, `CartService`, `OrderService`, `WhatsappConfigService`, `TranslationService` etc.
- **Alle Models** aus `core/models.ts`
- **Auth-Interceptor** & **Error-Interceptor** – nur SecureStorage statt `localStorage`
- **Alle Storefront-Komponenten** – `storefront-landing`, `product-card`, `cart`, `checkout`, `storefront-header`
- **i18n** (de/en/ar) via ngx-translate – komplett wiederverwendbar
- **WhatsApp-Flow** – `WhatsappConfigService` + Widget öffnen nativ `wa.me`
- **Guards**: `authGuard`, `permissionGuard` – keine Änderung nötig
- **SCSS-Theming** – Design-Tokens, Lila-Gradient, RTL-Support via `[dir="rtl"]`
- **API-Layer** – alle `HttpClient`-Calls gegen `https://api.markt.ma` laufen out-of-the-box

---

## 3. Was muss angepasst werden

**Kritisch:**
- **Subdomain-Routing** in `app.routes.ts` (Zeilen 355–368): `window.location.hostname`-Check muss für Mobile durch einen `PlatformService` abstrahiert werden (Capacitor hat keine Subdomain)
- **JWT in `localStorage`** → `@capacitor-community/secure-storage` Plugin (iOS Keychain / Android Keystore)
- **`window.location.hostname` Aufrufe** in Root- und Wildcard-Route → Capacitor-Kontext liefert `localhost`, kein Subdomain-Check möglich

**Navigation:**
- Admin-Shell-Erkennung via `adminPathPrefixes` in `app.component.ts` (Zeile 216): funktioniert, aber mobile Navigation braucht Bottom-Tab-Bar für Storefront
- `position: fixed` FABs (WhatsApp-Widget, Chatbot) müssen Safe-Area-aware werden (`env(safe-area-inset-bottom)`)

**Native Features:**
- Push Notifications → `@capacitor/push-notifications` (separates Backend-Feature)
- Camera für Produktfotos → `@capacitor/camera` statt `<input type="file">`
- Deep Links für `wa.me`-Öffnung → Capacitor `Browser`-Plugin (wichtig für iOS)
- Keyboard-Handling → `@capacitor/keyboard` (verhindert verdeckte Inputs im Checkout)

---

## 4. Riskante Stellen

| Risiko | Betroffene Datei | Warum |
|---|---|---|
| `window.location.hostname` + Subdomain-Check | `app.routes.ts` Z.355 + Z.389 | zeigt im App-Kontext immer `localhost` → falsches Routing |
| Admin-Sidebar `margin-left: 240px` | `app.component.ts` Z.47 | korrekt auf Desktop, sieht auf Mobile zu eng aus |
| `app-responsive-data-list` mit Hover-Styles | shared/components | Hover-Interaktionen = kein Touch-Feedback |
| `sp-mobile-panel` iframe Preview | `app.component.ts` Z.138 | iOS WKWebView erlaubt kein iframe zu `localhost` |
| `localStorage` JWT Token | `auth.service.ts` Z.19-33 | unverschlüsselt, App Store Rejection-Risiko |
| Meta Pixel | `app.component.ts` Z.239 | funktioniert nicht in nativer App-Umgebung |

---

## 5. Projektstruktur-Empfehlung

**Option A – Monorepo mit Nx (empfohlen langfristig):**
```
/apps/web/        → bestehendes Angular SPA (unveränderter Build)
/apps/mobile/     → Capacitor-Projekt das /apps/web-Build wraps
/libs/shared/     → extrahierte Services, Models, Pipes (schrittweise)
```

**Option B – Capacitor im selben Repo (Quick-Start, empfohlen für Anfang):**
```
/storeFrontend/          → bestehend (bleibt so)
/storeFrontend/android/  → Capacitor Android-Projekt (auto-generiert)
/storeFrontend/ios/      → Capacitor iOS-Projekt (auto-generiert)
capacitor.config.ts      → Einstiegspunkt
```

→ **Option B ist empfohlen für den Start** – kein Monorepo-Umbau nötig, Capacitor wird direkt ins bestehende Angular-Projekt integriert.

---

## 6. MVP-Scope (Storefront-App)

Nur die **Customer-Seite**, kein Admin-Panel:

| Feature | Route | Status |
|---|---|---|
| Store browsen | `/` (Subdomain-Landing) | vorhanden, Anpassung nötig |
| Produkte ansehen | `/products/:productId` | vorhanden |
| Warenkorb | `/cart` | vorhanden |
| Checkout + WhatsApp | `/checkout` | vorhanden |
| Login / Register | `/login`, `/register` | vorhanden |
| Mein Konto | `/customer` | vorhanden |
| Order-History | `/customer/orders` | vorhanden |
| Push Notifications | – | Phase 2 |

---

## 7. Reihenfolge nach ROI

1. **PWA-Manifest + Service Worker** einrichten via `ng add @angular/pwa` → sofort installierbar, kein Store
2. **Capacitor initialisieren** (`npm install @capacitor/core @capacitor/cli`) + `capacitor.config.ts` → Android-Build in 1 Tag
3. **Subdomain-Logik abstrahieren** → `PlatformService` mit `isNative(): boolean` per Capacitor-Detection
4. **SecureStorage** für JWT tauschen (localStorage → Keychain/Keystore)
5. **Safe-Area-Insets** für FABs + Fixed-Elemente (WhatsApp-Widget, FAB-Host, Promo-Banner)
6. **Bottom Navigation** für Storefront (Home / Suche / Cart / Profil) als neue Mobile-Komponente
7. **Deep Links** konfigurieren (App öffnet sich bei `*.markt.ma`-Links)
8. **Push Notifications** Backend-seitig (FCM/APNs Token pro User speichern)

---

## Further Considerations

1. **Welches MVP zuerst?** Nur Storefront (Kunden-App) oder auch Admin-Panel (Store-Besitzer-App)? Empfehlung: Storefront first – ROI höher, weniger Risiko.
2. **App Store Accounts** – Apple Developer ($99/Jahr) + Google Play ($25 einmalig) müssen beantragt werden, bevor die ersten Builds eingereicht werden können.
3. **Subdomain-Problem bei Capacitor**: Da es keine echten Subdomains gibt, brauchen wir eine alternative Strategie – z.B. Store-ID via Deep Link Parameter (`markt.ma/app?store=xyz`) oder QR-Code-basierter Einstieg in den jeweiligen Store.

e 
