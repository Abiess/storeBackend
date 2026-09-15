# markt.ma App-Factory – Architektur-Baseline

> **Status:** Living Document, Stand nach Phase 3.1 (Backend App-Isolation).
> Dies ist die **Baseline** für alle weiteren App-Factory-Arbeiten. Änderungen an
> der Architektur (neue Apps, neue Scopes, Tenant-Modell) sollen hier
> nachgeführt werden, bevor Code geschrieben wird.
>
> Verwandte Dokumente: `CODEBASE_CONTEXT.md` (allgemeine Projekt-Konventionen),
> `plan-mobileAppStrategy.prompt.md` (Mobile/Capacitor-Detailplan),
> `docs/DHL_INTEGRATION.md` (DHL-Carrier-Integration im Detail).

---

## 1. Zielarchitektur

markt.ma soll ein gemeinsames Spring-Boot-Backend / **Platform-Core** haben,
das von mehreren fachlich unabhängigen Apps genutzt wird, ohne dass jede App
ihre eigene Auth/User/Rollen-Infrastruktur neu erfindet.

**Plattformweit geteilt (Platform-Core):**
- Authentication / JWT (inkl. Phone-Quick-Auth)
- Users, `/api/me`
- Rollen (`Role`-Enum: `USER`, `ROLE_PLATFORM_ADMIN`, `ROLE_RESELLER`, `ROLE_SUPPLIER`)
- Files / MinIO
- (später) Push, zentrales Logging, AI-Quoten

**Fachlich getrennt, pro App:**
```
/api/stores/**        -> SHOP   (Store-Verwaltung, Produkte, Bestellungen, POS, Analytics, ...)
/api/stores/*/dhl/**   -> DHL    (DHL-Paketshop-App, siehe Abschnitt 6)
/api/stores/*/loyalty/**-> LOYALTY (Treueprogramm, Credits)
/api/maritime/**       -> MARITIME (GLOBAL, kein Store-Bezug)
/api/test/**           -> ISSUE_ANALYSIS (GLOBAL, aktuell Feasibility-Spike)
/api/<future-app>/**   -> weitere Apps nach demselben Muster
```

Eine neue App (Web, PWA, Capacitor, ggf. nativ) soll **nicht** die komplette
markt.ma Store-Frontend-Anwendung benötigen, sondern:
1. sich gegen den bestehenden Platform-Core authentifizieren (JWT),
2. ihre eigenen `/api/<app>/**`-Endpunkte nutzen,
3. serverseitig über das App-Entitlement-Konzept (Abschnitt 3/4) freigeschaltet
   werden, unabhängig davon, ob der User auch SHOP oder andere Apps nutzt.

## 2. Aktuelle Architektur (Stand: Phase 3.1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Spring Boot Backend                       │
│                                                                   │
│  Platform-Core (geteilt)          Fachliche Apps (isoliert)      │
│  ─────────────────────           ────────────────────────       │
│  AuthController                   SHOP:    StoreController,      │
│  JwtUtil / JwtAuthenticationFilter          OrderController,      │
│  User-Entity, Role-Enum                     PosController,       │
│  /api/me                                    AnalyticsController, │
│  MinIO (MediaController*)                   MediaController,     │
│                                              StoreRoleController, │
│  App-Entitlement-Kern (Phase 1):            AdminPaymentSettings │
│  - user_app_entitlements (DB)               Controller           │
│  - AppAccessChecker                                              │
│  - AppKey / AppAccessMode / AppScope        DHL (Paketshop-App): │
│                                              DhlController,       │
│  App-Isolation-Kern (Phase 3):              DhlLayoutController,  │
│  - @RequiresApp-Annotation                  DhlSlotController     │
│  - AppAccessInterceptor                                          │
│  - AppScopeSource                           LOYALTY:              │
│                                              LoyaltyController,   │
│                                              CreditController     │
│                                                                   │
│                                              MARITIME (GLOBAL):   │
│                                              MaritimeController   │
│                                                                   │
│                                              ISSUE_ANALYSIS       │
│                                              (GLOBAL, Spike):     │
│                                              IssueAnalysisTest    │
│                                              Controller           │
│                                                                   │
│                                              PLATFORM (Admin-Ops, │
│                                              kein App-Entitlement,│
│                                              sondern Rollen-Check):│
│                                              DhlAdminController    │
│                                              .testConnection/     │
│                                              healthCheck/getConfig│
└─────────────────────────────────────────────────────────────────┘
```
`*` MediaController ist SHOP-Domain (Store-Medienbibliothek), obwohl er
technisch MinIO (Platform-Core-Infrastruktur) nutzt.

**Wichtig:** Ein einziges Deploy-Artefakt (`app.jar`), ein systemd-Service
(`storebackend`). Alle Apps laufen im selben Prozess/JAR – die Trennung ist
**logisch** (Package/Annotation/Route), nicht **physisch** (kein Split in
mehrere Services/Deployments). Das ist bewusst so und aktuell nicht geplant zu
ändern (siehe Abschnitt 11).

## 3. LEGACY / MANAGED

Zentrales Konzept aus Phase 1 (`storebackend.enums.AppAccessMode`), **userweit**
(nicht pro App) ermittelt:

- **LEGACY**: User hat überhaupt keinen Eintrag in `user_app_entitlements`
  (für keine App/keinen Store) → Zugriff auf **alle** Apps bleibt exakt wie
  vor Einführung des Entitlement-Konzepts (kein Verhaltensunterschied,
  rückwärtskompatibel für alle Bestandsuser).
- **MANAGED**: Sobald für den User **irgendein** Eintrag existiert (für
  irgendeine App/irgendeinen Store) → ab diesem Zeitpunkt gilt für den
  **gesamten** User eine Positivliste: nur explizite `enabled=true`-Einträge
  gewähren Zugriff; fehlende App, fehlender Store oder `enabled=false` →
  kein Zugriff.

Ermittlung: `AppAccessChecker.getAccessMode(userId)` prüft
`userAppEntitlementRepository.existsByUserId(userId)`.

**Konsequenz für Tests/Betrieb:** Ein Bestandsuser ohne jegliche
Entitlement-Pflege verhält sich weiterhin wie vor Phase 1/3. Erst das
Anlegen eines einzigen `user_app_entitlements`-Eintrags schaltet den User auf
das neue, restriktivere Modell um – **für alle** seine Apps, nicht nur für
die eine, für die der Eintrag angelegt wurde.

## 4. AppKey-Liste

| AppKey | Scope (`AppScope`) | Fachliche Bedeutung | Beispiel-Controller |
|---|---|---|---|
| `SHOP` | `STORE` (storeId Pflicht) | Store-Verwaltung: Produkte, Bestellungen, POS, Analytics, Payment-Settings, Team-Rollen, Medienbibliothek | `OrderController`, `PosController`, `AnalyticsController`, `MediaController`, `StoreRoleController`, `AdminPaymentSettingsController`, `DhlAdminController.validateShipment/createLabel` (DHL **als Carrier** für eine Bestellung) |
| `DHL` | `STORE` (storeId Pflicht) | Eigenständige **DHL-Paketshop-App** (physischer Abhol-/Lager-Standort, Fächer/Slots, Layout) | `DhlController`, `DhlLayoutController`, `DhlSlotController` |
| `LOYALTY` | `STORE` (storeId Pflicht) | Treueprogramm, Credits/Guthaben | `LoyaltyController`, `CreditController` |
| `MARITIME` | `GLOBAL` (kein storeId) | Live-AIS-Schiffsdaten Tanger Med (kein Store-Bezug) | `MaritimeController` |
| `ISSUE_ANALYSIS` | `GLOBAL` (kein storeId) | Feasibility-Spike, aktuell ohne Store-Bezug | `IssueAnalysisTestController` |

Definiert in `storebackend.enums.AppKey` (Scope fest verdrahtet, siehe
`AppKey.getScope()`), DB-seitig abgesichert durch CHECK-Constraint
`ck_user_app_entitlement_scope` (Migration `V025__create_user_app_entitlements.sql`).

Erweiterung um eine neue App: **1)** neuen `AppKey`-Wert mit `AppScope`
ergänzen, **2)** CHECK-Constraint in einer neuen additiven Migration
erweitern, **3)** neuen Controller mit `@RequiresApp(AppKey.<NEU>)`
versehen. Kein Bestandscode muss dafür geändert werden.

## 5. Sicherheitskette

```
1. Spring Security (unverändert, vor allem anderen)
   JwtAuthenticationFilter -> SecurityConfig (.authorizeHttpRequests)
   -> Auth/JWT-Gültigkeit, emailVerified-Check, ROLE_*-Authorities

2. AppAccessInterceptor (Phase 3, zusätzliche äußere Schranke)
   Liest @RequiresApp (Methode > Klasse). Keine Annotation vorhanden
   -> PLATFORM_SHARED/PUBLIC, unverändertes Alt-Verhalten, Interceptor
      greift NICHT ein.
   Annotation vorhanden -> AppAccessChecker.hasAppAccess(userId, storeId, app)
   -> bei false: 403 { "code": "APP_ACCESS_DENIED", "app": "<APP>" }
   -> Scope nicht auflösbar (fehlender/ungültiger Pfad-Parameter,
      referenzierte Ressource nicht gefunden) => IMMER DENY (fail-closed),
      niemals stillschweigend ALLOW.

3. StoreAccessChecker / @PreAuthorize / StoreRole.permissions (unverändert)
   Fachlicher Zugriff INNERHALB der App: Owner-Check (isStoreAdmin),
   Team-Mitgliedschaft (hasStoreAccess), granulare Permissions
   (hasPermission(storeId, "ORDER_CREATE")).

4. Business-Methode
```

Die drei Schichten sind **additiv und unabhängig**: Schicht 2 ersetzt nichts
aus Schicht 1 oder 3. Ein Owner, der z. B. kein SHOP-Entitlement hat (im
MANAGED-Modus), wird bereits in Schicht 2 abgewiesen, bevor Schicht 3
(Owner-Check) überhaupt erreicht wird.

**Scope-Auflösung** (`AppScopeSource`, für Schicht 2):
- `STORE_ID_PARAM` (Default) – storeId direkt als Pfad-Parameter
- `ORDER_ID_PARAM` – storeId über `Order.store.id`
- `DHL_PARCEL_ID_PARAM` – storeId über `DhlParcel.store.id`
- `DHL_SLOT_ID_PARAM` – storeId über `DhlShelfSlot.store.id`
- `NONE` – nur für GLOBAL-Apps (kein storeId, User-weiter Scope)

## 6. DHL Paketshop vs. DHL Carrier

Zwei **fachlich und im Code strikt getrennte** Konzepte, beide mit „DHL“ im
Namen, aber unterschiedlichem `AppKey`:

| | **DHL-Paketshop-App** (`AppKey.DHL`) | **DHL-Carrier-in-SHOP** (`AppKey.SHOP`) |
|---|---|---|
| Bedeutung | Eigenständige App: physischer Abholstandort/Lager mit Fächern (Slots), Layout-Verwaltung | DHL als Versanddienstleister für **eine Bestellung** eines Stores |
| Controller | `DhlController`, `DhlLayoutController`, `DhlSlotController` | `DhlAdminController.validateShipment()` / `.createLabel()` |
| Pfade | `/api/stores/{storeId}/dhl/**` (Paketshop-Operationen) | `/api/admin/orders/{orderId}/dhl/validate` / `/create-label` |
| Scope | `STORE_ID_PARAM` | `ORDER_ID_PARAM` (→ `Order.store.id`) |
| Ein User mit NUR `DHL=true, storeId=121` | ✅ Zugriff auf Paketshop-Funktionen für Store 121 | ❌ Kein Zugriff (SHOP fehlt) |

Zusätzlich existiert eine **dritte Kategorie**, weder Paketshop noch Carrier:
**Plattform-Betriebs-/Diagnose-Endpunkte** für die EINE zentrale,
plattformweite DHL-Konfiguration (`DhlProperties`, ENV-Variablen
`DHL_*`/`DHL_PLATFORM_*`):

- `DhlAdminController.testConnection()` / `.healthCheck()` / `.getConfig()`
- Kein `storeId`/`orderId` im Pfad, daher **kein** `@RequiresApp` (Scope
  nicht auflösbar, ein STORE-App-Gate müsste sonst fail-closed IMMER
  verweigern – auch für LEGACY-User, was eine Verhaltensänderung wäre).
- Abgesichert seit Phase 3.1 durch `@PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")`
  (vorher fälschlich `isAuthenticated()` – jeder eingeloggte User, auch ein
  MANAGED-DHL-only-User ohne SHOP/Platform-Rolle, konnte diese Diagnose-Infos
  abrufen).

**Merksatz:** *"DHL" im Pfad/Namen ist kein verlässlicher Indikator für den
`AppKey` – die Unterscheidung läuft über die fachliche Frage "Paketshop-Standort
oder Versand-Vorgang einer Bestellung oder Plattform-Betrieb?", nicht über den
String "dhl".*

## 7. Web/iOS/Android-Ziel

Strategie (Detailplan: `plan-mobileAppStrategy.prompt.md`):

- **Phase 1 (kurzfristig): PWA** – bestehendes Angular-Frontend als
  Progressive Web App, kein Codeumbau.
- **Phase 2: Capacitor** – bestehender Angular-Build wird 1:1 in
  Capacitor gewrappt (iOS + Android), **kein** natives Rewrite, alle 50+
  bestehenden Services/Components/Models bleiben nutzbar.
- **Empfohlenes Repo-Layout:** Capacitor-Projekt direkt im bestehenden
  `storeFrontend`-Repo (`storeFrontend/android/`, `storeFrontend/ios/`,
  auto-generiert), kein Monorepo-Umbau.
- **Bekannte Anpassungen für Mobile:**
  - Subdomain-Erkennung (`window.location.hostname`) funktioniert im
    Capacitor-Kontext nicht (immer `localhost`) → muss durch einen
    `PlatformService`/Deep-Link-Parameter (`markt.ma/app?store=xyz`) oder
    QR-Code-Einstieg ersetzt werden.
  - JWT-Storage: `localStorage` → `@capacitor-community/secure-storage`
    (iOS Keychain / Android Keystore).
  - iframe-Preview (Theme-Editor) funktioniert in iOS WKWebView nicht.
- **Für eine neue, unabhängige App** (DHL-Paketshop-App, Loyalty-App, etc.)
  gilt dieselbe Strategie: Web zuerst, dann Capacitor-Wrap, **ohne** eine
  eigene, parallele Auth-/State-Architektur - Wiederverwendung von
  `AuthService`/`AuthInterceptor`/`AuthGuard` aus dem Platform-Core-Frontend
  (ggf. als eigenständiges, schlankeres Paket extrahiert, siehe Backlog).

## 7a. Shared Frontend App UI (Web, `storeFrontend`)

Seit dem DHL-App-Navigations-Fix existiert ein erster, bewusst kleiner
Baustein einer generischen "App-Shell" im Angular-Frontend. Ziel: Jede
künftige App (`MARITIME`, `LOYALTY`, `ISSUE_ANALYSIS`, ...) bekommt
Navigation, Account-Bereich und Routen-Konsistenz **ohne eigene UI-Library
und ohne Kopie der Nav-/Auth-Logik** – nur über Konfiguration.

### Shared (app-übergreifend, `src/app/shared/components/...` bzw. `core/utils/...`)

| Baustein | Ort | Zweck |
|---|---|---|
| `AppNavigationComponent` | `shared/components/app-navigation/` | Rein präsentationale, config-getriebene App-Navigation (Tabs/Icons/Labels). Kennt weder `storeId` noch DHL/MARITIME-Fachlogik – nur `AppNavConfig`. |
| `AppNavConfig` / `AppNavItem` | `shared/components/app-navigation/app-navigation.component.ts` | Konfigurationsformat: `{ appSegment, legacySegment?, items: [{ key, labelKey, icon, route }] }`. `route` ist relativ zum App-Basis-Pfad (`''` = Übersicht). |
| `resolveAppBasePath(url, config)` | `core/utils/app-route.util.ts` | Generischer Resolver: ermittelt aus der aktuellen URL den App-Basis-Pfad, sowohl für die app-zentrische Route `/apps/{appSegment}/:contextId` als auch (optional) für einen Legacy-Alias `/stores/:contextId/{legacySegment}`. Sorgt dafür, dass Navigation **innerhalb derselben Routen-Familie** bleibt (kein versehentlicher Wechsel zur Shop-Admin-Shell). |
| `AppAccountComponent` | `shared/components/app-account/` | Generischer Account-/Profil-Bereich (E-Mail-Anzeige, Logout). Liest ausschließlich den bestehenden, plattformweiten `AuthService` – keine App-spezifische Auth-/State-Logik. Label-Keys (`titleKey`/`emailLabelKey`/`logoutLabelKey`) sind per Input überschreibbar, damit jede App ihre eigenen i18n-Texte weiterverwenden kann. |

### DHL-spezifisch (`src/app/features/dhl/...`)

| Baustein | Ort | Zweck |
|---|---|---|
| `DHL_NAV_CONFIG` | `features/dhl/dhl-nav.config.ts` | Reine Daten (`AppNavConfig`-Instanz) für die DHL-Navigation: `appSegment: 'dhl'`, `legacySegment: 'dhl'`, Items Übersicht/Einlagern/Abholen/Lagerplan/Account. |
| DHL-Fachkomponenten | `dhl.component.ts`, `dhl-store-parcel.component.ts`, `dhl-pickup-parcel.component.ts`, `dhl-warehouse-plan.component.ts`, `dhl-account.component.ts` | Enthalten die eigentliche DHL-Fachlogik (Scan-Flows, Tracking-Validierung, Slot-Grid, Lagerplan). Binden nur noch `<app-navigation [config]="navConfig">` bzw. `<app-account>` ein – keine eigene Nav-/Account-Implementierung mehr. |
| `resolveDhlBasePath(url)` | `core/utils/dhl-route.util.ts` | **Nur noch Kompatibilitäts-Wrapper** (`resolveAppBasePath(url, { appSegment: 'dhl', legacySegment: 'dhl' })`), damit die bestehenden `router.navigate(...)`-Aufrufe in den DHL-Komponenten unverändert bleiben. Neue Apps sollen `resolveAppBasePath()` direkt mit eigener `AppRouteConfig` verwenden statt einen weiteren App-spezifischen Wrapper zu schreiben. |

### Architekturregel

- **Keine neue Sidebar/Nav-Komponente pro App.** Reicht `AppNavigationComponent`
  aus (Tabs/Icons/Labels/Routen), MUSS sie wiederverwendet werden. Eine neue,
  eigene Nav-Komponente ist nur zulässig, wenn die UI strukturell etwas
  fundamental anderes braucht als eine Tab-/Item-Liste.
- **App-spezifische Unterschiede gehören in Konfiguration**, nicht in Code:
  Labels (i18n-Keys), Icons, Routen-Segmente (`appSegment`/`legacySegment`),
  Reihenfolge der Items. Siehe `DHL_NAV_CONFIG` als Referenzmuster.
- **`contextId`/App-Kontext ist generisch zu denken.** `AppNavConfig` und
  `resolveAppBasePath()` kennen kein `storeId` – nur einen austauschbaren
  Pfad-Parameter. Dass DHL aktuell `storeId` als Kontext nutzt, ist reine
  Übergangslösung (siehe Abschnitt 8) und darf sich nicht in generischem
  Code verankern.
- **Auth/Profile/Account werden nicht pro App dupliziert.** Jede App nutzt
  `AppAccountComponent` (+ eigene Label-Overrides), nicht eine eigene
  Kopie der Logout-/User-Anzeige-Logik. Die zugrunde liegende Auth-Logik
  bleibt zentral in `AuthService`.
- **Mobile/Capacitor-Kompatibilität ist mitzudenken:** Dieselbe
  `AppNavConfig` (Icons/Labels/Routen) soll später unverändert an eine
  Bottom-Navigation- oder Drawer-Variante für Capacitor übergeben werden
  können – deshalb bleibt das Konfigurationsformat bewusst UI-neutral
  (kein Angular-Router-Detail außer dem reinen Routen-Segment).

**Bewusst (noch) nicht umgesetzt:** Ein vollständiger `AppShellComponent`
mit verschachtelten Parent-/Child-Routen (Header/Content-Wrapper analog zum
Zielbild `AppShell → AppHeader/AppNavigation/AppContent`). Aktuell binden
die Feature-Komponenten `<app-navigation>`/`<app-account>` noch selbst ein.
Das ist der nächste, risikoreichere Ausbauschritt und wurde bewusst
zurückgestellt, um keinen Big-Bang-Umbau der bestehenden, funktionierenden
DHL-Routen auszulösen.

## 8. Übergangslösung storeId

Aktuell ist `storeId` der **einzige** Tenant-/Scope-Schlüssel im gesamten
App-Isolation-Konzept (`AppScopeSource.STORE_ID_PARAM` und alle abgeleiteten
Varianten `ORDER_ID_PARAM`/`DHL_PARCEL_ID_PARAM`/`DHL_SLOT_ID_PARAM` lösen am
Ende immer auf eine `Store.id` auf). Das gilt auch für Apps, die **fachlich
kein "Shop"** sind:

- Die **DHL-Paketshop-App** nutzt `Store` als Proxy für "physischer
  Abholstandort" – ein Paketshop *ist* in der DB ein `Store`-Datensatz,
  obwohl konzeptionell ein Paketshop kein Onlineshop ist.
- Das **LOYALTY**-Programm ist ebenfalls an einen `Store` gebunden, nicht an
  einen allgemeineren Begriff wie "Merchant" oder "Location".

Das ist eine **bewusste Übergangslösung**: Sie erlaubt es, das komplette
App-Entitlement-/Isolation-Konzept (Phase 1 + Phase 3) **ohne DB-Migration
des Kernmodells** einzuführen, weil `Store` bereits als stabiler, referenzierter
Tenant-Anker existiert (`owner_id`, `store_roles`, etc.). Der Preis: Jede neue
App, die keinen echten 1:1-Bezug zu einem "Shop" hat, muss trotzdem einen
`Store`-Datensatz referenzieren, um scope-fähig zu sein.

## 9. Zukünftiges Tenant/Location-Modell (Ausblick, NICHT implementiert)

Sobald mehr als eine store-fremde App produktiv ist (z. B. eigenständige
DHL-Paketshops ohne zugehörigen Online-Store, oder ein Loyalty-Programm, das
mehrere Stores bündelt), wird `Store` als alleiniger Scope-Anker zu eng.
Denkbare Richtung für eine spätere Phase (**kein aktueller Auftrag,
keine Migration, nur Zielbild**):

- Einführung eines generischen **`Tenant`**- oder **`Location`**-Konzepts,
  das `Store` als einen von mehreren möglichen Tenant-Typen kapselt
  (`TenantType.STORE`, `TenantType.DHL_LOCATION`, `TenantType.LOYALTY_PROGRAM`, ...).
- `AppScopeSource` würde dann nicht mehr zwingend auf `Store.id` auflösen,
  sondern auf eine `Tenant.id`, wobei `Store` weiterhin ein Spezialfall
  (`Tenant` mit `type=STORE`) bliebe – **additiv**, kein Bruch für SHOP.
- `user_app_entitlements.store_id` würde zu `tenant_id` verallgemeinert
  (mit Rückwärtskompatibilität über eine View oder einen zusätzlichen
  Discriminator).
- Migration wäre additiv (neue Tabelle/Spalten, kein Rename bestehender
  Spalten), um bestehende SHOP-Funktionalität nicht zu gefährden.

Dies ist **explizit Backlog**, keine Aufgabe der aktuellen Phase.

## 10. Bereits geschützte Controller (Stand nach Phase 3.2)

### Klassenweit `@RequiresApp(SHOP)` (STORE_ID_PARAM, sofern nicht anders vermerkt)

| Controller | AppKey | Scope | Seit |
|---|---|---|---|
| `StoreRoleController` | SHOP | STORE_ID_PARAM | Phase 3 |
| `MediaController` | SHOP | STORE_ID_PARAM | Phase 3 |
| `PosController` | SHOP | STORE_ID_PARAM | Phase 3.1 |
| `OrderController` | SHOP | STORE_ID_PARAM | Phase 3.1 |
| `AdminPaymentSettingsController` | SHOP | STORE_ID_PARAM | Phase 3.1 |
| `AnalyticsController` | SHOP | STORE_ID_PARAM | Phase 3.1 |
| `ProductTierPriceController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `StoreBannerController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `HomepageSectionController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `RedirectController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `StructuredDataController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `DeliveryController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `OnboardingController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `TelegramController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `TelegramMtprotoController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `ChatbotIntentManagementController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `ChatManagementController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `FaqManagementController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `WooCommerceController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `StoreProductController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `SupplierInvoiceDocumentController` | SHOP | STORE_ID_PARAM | **Phase 3.2** |
| `DhlAdminController.validateShipment()` | SHOP | ORDER_ID_PARAM | Phase 3 |
| `DhlAdminController.createLabel()` | SHOP | ORDER_ID_PARAM | Phase 3 |
| `DhlController` | DHL | STORE_ID_PARAM | Phase 3 |
| `DhlLayoutController` | DHL | STORE_ID_PARAM | Phase 3 |
| `DhlSlotController` | DHL | STORE_ID_PARAM | Phase 3 |
| `LoyaltyController` | LOYALTY | STORE_ID_PARAM | Phase 3 |
| `CreditController` | LOYALTY | STORE_ID_PARAM | Phase 3 |
| `MaritimeController` | MARITIME | NONE (GLOBAL) | Phase 3 |
| `IssueAnalysisTestController` | ISSUE_ANALYSIS | NONE (GLOBAL) | Phase 3 |

### Methodenscharf annotiert (Mixed-Controller, **Phase 3.2**)

Nur die geschützten (authentifizierten, nicht-public) Methoden tragen
`@RequiresApp(SHOP)`; PUBLIC-GETs bleiben unverändert unannotiert.

| Controller | Annotierte Methoden | Scope |
|---|---|---|
| `ProductController` | `createProduct`, `updateProduct`, `patchProduct`, `deleteProduct`, `setFeatured`, `generateAiProductSuggestion` (`/ai-suggest`), `generateAiSuggestionV2` (`/ai-suggest-v2`), `checkAiStatus` (`/ai-status`) | STORE_ID_PARAM |
| `ProductVariantController` | `createVariant`, `updateVariant`, `deleteVariant`, `generateVariants` | STORE_ID_PARAM |
| `ProductOptionController` | `createProductOption`, `updateProductOption`, `deleteProductOption`, `regenerateVariants` | STORE_ID_PARAM |
| `ProductMediaController` | `addMediaToProduct`, `updateProductMedia`, `setPrimaryImage`, `deleteProductMedia` | STORE_ID_PARAM |
| `CategoryController` | `createCategory`, `updateCategory`, `deleteCategory` | STORE_ID_PARAM |
| `StoreSliderController` | `getSlider`, `addToGallery`, `removeFromGallery`, `updateGalleryCaption`, `reorderGallery`, `updateSettings`, `uploadImage`, `updateImage`, `reorderImages`, `deleteImage`, `initializeSlider` | STORE_ID_PARAM |
| `SeoSettingsController` | `updateSeoSettings`, `uploadSeoAsset` | STORE_ID_PARAM |
| `CommissionController` | `getResellerPendingCommissions` | STORE_ID_PARAM |
| `DropshippingController` | `getSupplierLinksForStore`, `calculateTotalMargin` (STORE_ID_PARAM); `getOrderItemsWithDropshipping` (ORDER_ID_PARAM) | siehe Spalte |
| `ThemeController` | `getStoreThemes`, `applyTemplate`, `onboardStoreWithTemplate` | STORE_ID_PARAM |

**Nicht über `@RequiresApp`, sondern über bestehende Rollenprüfung
abgesichert** (bewusst, siehe Abschnitt 6):

| Endpunkt | Absicherung | Seit |
|---|---|---|
| `DhlAdminController.testConnection()` | `@PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")` | Phase 3.1 |
| `DhlAdminController.healthCheck()` | `@PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")` | Phase 3.1 |
| `DhlAdminController.getConfig()` | `@PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")` | Phase 3.1 |

Automatisiert regressionsgeprüft in:
- `src/test/java/storebackend/security/AppAccessInterceptorTest.java`
  (generisches ALLOW/DENY-Verhalten des Interceptors)
- `src/test/java/storebackend/security/Phase31AppIsolationTest.java`
  (reflection-basierte Verdrahtungsprüfung Phase 3.1)
- `src/test/java/storebackend/security/Phase32AppIsolationTest.java`
  (reflection-basierte Verdrahtungsprüfung Phase 3.2: sitzt die richtige
  Annotation an der richtigen Stelle – bzw. bewusst nicht)

## 11. Offene Punkte / Backlog

Nicht Teil der bisherigen Phasen, bewusst zurückgestellt:

1. **`AppScopeSource` unterstützt noch keine Variant-/Product-/Theme-/
   OrderItem-IDs** – nur `STORE_ID_PARAM`, `ORDER_ID_PARAM`,
   `DHL_PARCEL_ID_PARAM`, `DHL_SLOT_ID_PARAM`, `NONE`. Dadurch bewusst
   zurückgestellt (kein `@RequiresApp`, aber weiterhin durch bestehende
   Rollen-/Owner-Prüfung abgesichert):
   - `DropshippingController.saveSupplierLink/getSupplierLink/updateSupplierLink/deleteSupplierLink`
     (variantId-Pfad, kein `VARIANT_ID_PARAM`-Resolver)
   - `DropshippingController.getSupplierLinksForProduct` (productId-Pfad, kein `PRODUCT_ID_PARAM`-Resolver)
   - `DropshippingController.updateFulfillment` (OrderItem itemId-Pfad, kein Resolver)
   - `ThemeController.createTheme` (storeId nur im Body, nicht im Pfad)
   - `ThemeController.updateTheme/deleteTheme/activateTheme` (nur themeId-Pfad, kein `THEME_ID_PARAM`-Resolver)
2. **`AdminDeliveryController` (`/api/admin/delivery-options`)** – PLATFORM-weiter
   Endpunkt (kein storeId), aktuell nur durch "beliebiger authentifizierter
   User" geschützt (kein Rollen-Check) – analog zur ursprünglichen
   DhlAdminController-Lücke aus Phase 3.1, aber bewusst NICHT in Phase 3.2
   behoben (Phase 3.2 = SHOP-Gating, nicht generelle Rollenhärtung).
   **Empfehlung für eine spätere Phase.**
3. **`CouponController.java` ist eine leere Stub-Datei (0 Byte)** – keine
   Admin-Coupon-Endpunkte existieren aktuell im Backend (nur
   `PublicCouponController`, bereits public/cart-seitig).
4. **`WooCommerceAdminController.cleanDescriptions`** – storeId ist optional
   und nur im Request-Body (Multi-Store-Bulk-Operation), kein pfadbasierter
   Scope auflösbar – bewusst nicht annotiert.
5. **`WizardProgressController`** – kein storeId-Pfadparameter (Onboarding
   VOR Store-Erstellung); SHOP-Gating würde ein Henne-Ei-Problem für
   Erstnutzer erzeugen – bewusst nicht annotiert.
6. **`MarketplaceCatalogController`, `SupplierProductController`,
   `DeliveryPartnerController`** – andere Akteure (Marketplace-weit,
   Supplier-Self-Service, Delivery-Partner-Self-Service), kein Store-Owner-
   Kontext – außerhalb des SHOP-Scopes, bewusst nicht annotiert.
7. **Weitere Mixed-Controller außerhalb der in Phase 3.2 genannten
   Kategorien** könnten noch existieren – diese Phase deckt die explizit vom
   Auftrag genannten Bereiche vollständig ab (Product/Variant/Option/
   TierPrice, Category, Coupon, StoreBanner/HomepageSection/Slider/Theme/
   SEO/Redirect, Delivery/Payment-Admin, Supplier/StoreProduct, WooCommerce,
   Telegram-Admin, Chatbot/FAQ-Admin, Commission/Dropshipping/Marketplace,
   Onboarding/WizardProgress).
8. **Kein Refresh-Token-Mechanismus** im Auth-Kern (24h-Hard-Expiry) –
   relevant für Mobile/PWA mit langer Nutzungsdauer.
9. **`AppAccessChecker` noch nicht für alle GLOBAL-Apps produktiv genutzt**
   (`ISSUE_ANALYSIS` ist laut Code-Kommentar nur ein Feasibility-Spike).
10. **Kein generisches, schlankes Frontend-Auth-Paket** ohne Store-Abhängigkeiten
    – aktuell liegt `AuthService`/`AuthInterceptor`/`AuthGuard` im
    monolithischen `storeFrontend`; eine neue eigenständige App-Instanz müsste
    diese Dateien kopieren statt importieren.
11. **Tenant/Location-Modell** (Abschnitt 9) – nur Zielbild, keine Migration.
12. **Physische Trennung der Deployments** – aktuell ein JAR/ein systemd-Service
    für alle Apps; keine Isolation auf Prozess-/CI-Ebene zwischen SHOP und
    neuen Apps. Nicht dringend, aber zu bedenken bei Skalierung oder wenn eine
    App unabhängig von SHOP releast werden soll.
13. **`/api/me`-Response um explizite App-Liste verifizieren** –
    `AuthResponse.UserDTO` hat bereits Felder `appAccessMode`/`apps`, deren
    tatsächliche Befüllung (welche Apps, welcher Store) wurde in dieser
    Analyse nicht bis ins Detail nachvollzogen und sollte vor einer neuen
    App-Frontend-Integration verifiziert werden.
14. **DHL-Paketshop ohne zugehörigen Online-Store** – aktuell technisch nicht
    möglich, da jeder Paketshop ein `Store`-Datensatz sein muss (siehe
    Abschnitt 8). Bedarf klären, bevor Abschnitt 9 angegangen wird.

