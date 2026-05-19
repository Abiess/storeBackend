# Plan: Mobile App Strategy – markt.ma (Android + iOS)

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
