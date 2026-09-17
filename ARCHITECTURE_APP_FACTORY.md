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

## 7b. App Factory: App-Launcher, App-Switcher & Context-Auswahl

Aufbauend auf Abschnitt 7a wurde die Plattform um eine generische
**App-Launcher/-Switcher/-Context**-Infrastruktur erweitert. Ziel: `markt.ma`
verhält sich wie eine echte App-Factory – neue Apps (`MARITIME`, `LOYALTY`,
`ISSUE_ANALYSIS`, künftige Apps) werden ausschließlich über
**Konfiguration + Routing + Fachkomponenten** eingebunden, nicht über neue
parallele Launcher-/Switcher-/Navigations-Lösungen.

### Neue Shared-Bausteine

| Baustein | Ort | Zweck |
|---|---|---|
| `AppRegistry` (`APP_REGISTRY`, `APP_REGISTRY_ORDER`) | `core/config/app-registry.ts` | Rein deklaratives Verzeichnis aller Apps: `{ key, titleKey, descriptionKey?, icon, baseRoute, scope: 'STORE'\|'GLOBAL', contextSelectorSupported? }`. **Enthält KEINE Berechtigungslogik** – nur Darstellungs-/Routing-Metadaten. |
| `AppContextService` | `core/services/app-context.service.ts` | Generische Aufbereitung der bereits vorhandenen `AppEntitlement`s aus `AuthService`: `getAvailableApps()` (distinct Apps mit ≥1 aktivem Entitlement), `getContexts(app)` (alle Contexts/Stores dieser App als `AppContext { app, contextId, enabled }`), `hasMultipleApps()`. Einzige Quelle für "welche Apps/Contexts sieht der User" – wird von `AppAccessService`, `AppLauncherComponent`, `AppSwitcherComponent` und `AppContextSelectorComponent` gemeinsam genutzt (keine doppelte Auswertung der `apps`-Liste). |
| `AppLauncherComponent` (`app-launcher`) | `features/apps/app-launcher.component.ts` | Generischer "Meine Apps"-Bildschirm (`/apps`). Zeigt **eine Karte pro App** (nicht pro Context!), Design als einheitliche markt.ma-App-Karten (Design-Tokens/Icons/i18n wiederverwendet). Klick navigiert über `AppAccessService.resolveAppEntryUrl(app)`. |
| `AppContextSelectorComponent` (`app-context-selector`) | `shared/components/app-context-selector/` | Generische Context-/Standort-Auswahl für STORE-scoped Apps mit >1 Context. Liest die App NICHT aus einer fest verdrahteten Store-Auswahl, sondern aus Routen-`data.app` (z.B. `apps/dhl` → `{ data: { app: AppKey.DHL } }`). `contextId` ist generisch (heute technisch = `storeId`), erweiterbar auf `tenantId`/`locationId`/`workspaceId`. |
| `AppSwitcherComponent` (`app-switcher`) | `shared/components/app-switcher/` | Dezenter "Apps wechseln"-Dropdown, **nur sichtbar bei >1 verfügbaren Apps** (`AppContextService.hasMultipleApps()`). In `AppNavigationComponent` eingehängt (siehe unten) – dadurch bekommt **jede** App automatisch den Switcher, ohne eigene Integration pro App. |
| `AppNoAccessComponent` | `features/apps/app-no-access.component.ts` | Sichere, neutrale Fehlerseite (`/apps/no-access`) für MANAGED-User ohne (mehr) aktive Entitlements. Keine eigene Auth-Logik, nur `AuthService.logout()`. |
| `AppAccessService.resolveAppEntryUrl(app)` | `core/services/app-access.service.ts` | Zentrale, einzige Regel "1 Context → direkt öffnen, >1 Contexts (bei `contextSelectorSupported`) → Context-Auswahl, sonst deterministischer Fallback". Wird von Login-Redirect, App-Launcher und App-Switcher gleichermaßen genutzt (keine Duplikation der Navigationsregel). |

`AppNavigationComponent` (Abschnitt 7a) wurde **nicht dupliziert**, sondern
minimal erweitert: Sie bindet nun `<app-switcher>` als letztes Element ein.
Jede App, die bereits `<app-navigation [config]="...">` nutzt (aktuell nur
DHL), bekommt den App-Switcher damit automatisch – ohne Codeänderung in den
DHL-Fachkomponenten.

### Login-Redirect-Regel (`AppAccessService.getPrimaryAppHomeUrl()`)

Ersetzt die bisherige starre Priorität `DHL > LOYALTY > SHOP > MARITIME >
ISSUE_ANALYSIS` durch:

| Situation | Ziel |
|---|---|
| `LEGACY` | Unverändert (bestehender "Meine Stores"-Flow). |
| `MANAGED`, 0 verfügbare Apps | `/apps/no-access` (sichere Fehlerseite). |
| `MANAGED`, genau 1 verfügbare App, 1 Context | Direkt in die App+Context (z.B. `/apps/dhl/121`). |
| `MANAGED`, genau 1 verfügbare App, >1 Contexts | App-Context-Auswahl (`/apps/dhl` → Liste der Contexts). **Kein** Sprung in einen zufälligen Context. |
| `MANAGED`, >1 verfügbare Apps | `/apps` (App-Launcher). Mehrere Entitlements DERSELBEN App zählen dabei als **eine** App. |

App-Auswahl (Launcher) und Context-/Standort-Auswahl bleiben bewusst zwei
getrennte Schritte/Komponenten.

### Sicherheit

App-Launcher/-Switcher/-Context-Auswahl sind **ausschließlich UX** (welche
Karte/welcher Menüpunkt angezeigt wird). Die tatsächliche Autorisierung
bleibt unverändert:

- Backend: `@RequiresApp`, `AppAccessInterceptor`, `StoreAccessChecker`/Rollen/Permissions.
- Frontend: `AppAccessService.isUrlAllowed()` (unverändertes Prinzip aus Phase 2,
  nur um die "bare App-Route ohne Context" (`/apps/dhl`) als gültigen,
  contextlosen Zugriffsfall ergänzt – erlaubt, sobald irgendein aktiver
  Context für diese App existiert).

Es wurde **keine neue Sicherheitsentscheidung ausschließlich im Frontend**
eingeführt.

### Architekturregel (Ergänzung zu Abschnitt 7a)

- Neue Apps benötigen **keine eigene** `XyzAppSwitcher`-/`XyzLauncher`-Komponente –
  ein zusätzlicher `APP_REGISTRY`-Eintrag (+ ggf. eine `apps/{segment}`-Route
  für die Context-Auswahl) genügt.
- `AppRegistry` liefert nur Darstellung/Routing – die Quelle der erlaubten
  Apps/Contexts bleibt ausschließlich `AuthService`/`AppEntitlement`
  (über `AppContextService`).
- Web, PWA und künftige Capacitor-Clients (iOS/Android) können denselben
  `APP_REGISTRY` + dieselben `AppContext`-Daten nutzen: Desktop rendert
  Karten/Dropdown, Mobile könnte dieselbe Datenbasis später als
  Bottom-Sheet/Bottom-Navigation/Drawer darstellen (kein Hover-only-Verhalten
  in den neuen Komponenten; alle Interaktionen sind klick-/tap-basiert).

**Bewusst (noch) nicht umgesetzt:** Weiterhin kein vollständiger
`AppShellComponent` mit verschachteltem Parent-/Child-Routing (siehe
Abschnitt 7a) – der App-Switcher wurde stattdessen als kleiner,
wiederverwendbarer Baustein in die bestehende `AppNavigationComponent`
integriert, um das Risiko eines Big-Bang-Umbaus zu vermeiden.

## 7c. Architekturtest: MARITIME als zweiter Consumer

Um zu prüfen, ob die in 7a/7b geschaffene Factory-Infrastruktur wirklich
generisch ist (und nicht implizit auf DHL zugeschnitten war), wurde `MARITIME`
– bisher eine isolierte Single-Page-Ansicht unter `/tools/maritime` ohne Nav,
ohne Account-Bereich, ohne App-Registry-Anbindung an die neue Struktur – auf
dieselben Shared-Bausteine wie DHL umgestellt. Es wurde **keine** neue
Maritime-spezifische Navigations-/Account-/Switcher-Komponente gebaut –
es handelt sich lediglich um Umverdrahtung, keine Neuimplementierung.

### Ergebnis: unverändert wiederverwendet (0 Änderungen nötig)

- `AppRegistry`-Infrastruktur (nur der `baseRoute`-Wert für `MARITIME` wurde
  aktualisiert, die Struktur selbst blieb unverändert).
- `AppContextService` (`getAvailableApps()`, `hasMultipleApps()`,
  `getContexts()`) – funktioniert für ein GLOBAL-Entitlement (`storeId: null`)
  ohne jede Anpassung.
- `AppLauncherComponent` / `AppSwitcherComponent` – zeigen MARITIME als Karte
  bzw. im Switcher an, sobald `AppContextService` es liefert. Keine
  MARITIME-spezifische Fallunterscheidung im Code.
- `AppAccountComponent` – von `MaritimeAccountComponent` 1:1 wiederverwendet
  (analog zu `DhlAccountComponent`), ohne Label-Overrides.
- `AppNavigationComponent` – von `MaritimeComponent` per
  `<app-navigation [config]="navConfig">` eingebunden; es existiert **keine**
  `MaritimeNavComponent`.
- `AppAccessService.resolveAppEntryUrl()` / `getPrimaryAppHomeUrl()` – die
  bestehende "1 Context → direkt, >1 Apps → Launcher"-Regel griff ohne
  Sonderfall für MARITIME.

### Ergebnis: eine legitime, kleine Erweiterung der Shared-Infrastruktur

MARITIME ist die erste **GLOBAL**-scoped App (kein `storeId`/Context-Segment
in der Route), während `resolveAppBasePath()`/`AppRouteConfig`
(`core/utils/app-route.util.ts`) bis dahin implizit von einem
STORE-scoped, parametrisierten Pfad (`/apps/{segment}/{contextId}/...`)
ausgingen. Ergänzt wurden zwei optionale, abwärtskompatible Felder:

- `scoped?: boolean` (Default `true`) – `false` bedeutet: die App hat keinen
  Context/`storeId`, der Basispfad ist der literale `/apps/{appSegment}`.
- `legacyBasePath?: string` – literale Legacy-Route (`/tools/maritime`), die
  weiterhin als gültiger Alias erkannt wird.

Für DHL (weiterhin `scoped: true`/Default) ändert sich dadurch nichts. Diese
Erweiterung ist generisch (jede künftige GLOBAL-App kann sie nutzen), keine
MARITIME-spezifische Sonderlogik.

### Was bewusst MARITIME-spezifisch bleibt

- Die gesamte Fachlogik in `maritime.component.ts` (AIS-Schiffs-Polling,
  Hafenwechsel, Wetter, Schiffsdetails) – unverändert, unabhängig von
  Navigation/Shell.
- `MARITIME_NAV_CONFIG` (`features/tools/maritime/maritime-nav.config.ts`) –
  reine Daten (Keys/Routen/Icons), keine neue Komponente.
- Die Legacy-Route `/tools/maritime` bleibt aktiv (produktiv genutzt) und
  zeigt weiterhin die Shop-Admin-Sidebar (`adminPathPrefixes` enthält
  `/tools`, bewusst nicht angefasst – LEGACY-Verhalten). Die neue primäre
  Route `/apps/maritime` ist **nicht** in `adminPathPrefixes` und zeigt daher
  konsistent keine Shop-Sidebar (gleiches Muster wie beim DHL-Fix in
  Abschnitt 2).

### Verdikt

Das Factory-Muster funktioniert mit einem zweiten echten Consumer: Eine neue
App (auch mit abweichendem Scope) benötigt nur `AppKey` +
`AppRegistry`-Eintrag + Route + `AppNavConfig` + Fachkomponenten – keine neue
Sidebar-, Switcher-, Launcher- oder Account-Komponente. Die einzige nötige
Änderung an gemeinsamer Infrastruktur (`scoped`/`legacyBasePath`) war eine
kleine, rückwärtskompatible Generalisierung, keine App-spezifische
Sonderlogik.

## 7d. Weitere Reduktion von App-Hardcodings in `AppAccessService`

Nach dem MARITIME-Architekturtest (7c) verblieben zwei Stellen mit einem
Codepfad pro `AppKey`: `AppAccessService.classifyUrl()` (URL → App) und
`AppAccessService.buildAppHomeUrl()` (App → Ziel-URL). Für **GLOBAL**-Apps
(kein Context/`storeId`) wurden diese Stellen jetzt generalisiert:

- `AppRegistryEntry` hat ein neues optionales Feld `legacyBasePath?: string`
  (analog zu `AppRouteConfig.legacyBasePath` aus 7c) – die einzige zusätzliche
  Metadaten-Angabe, die eine GLOBAL-App im `APP_REGISTRY` braucht, falls sie
  eine produktiv genutzte Legacy-URL hat (z.B. MARITIME → `/tools/maritime`).
- `classifyUrl()`: Der bisherige hardcodierte `if`-Block je GLOBAL-App
  (MARITIME, ISSUE_ANALYSIS) wurde durch **eine** generische Schleife über
  `APP_REGISTRY_ORDER` ersetzt: Für jede App mit `scope === 'GLOBAL'` wird
  geprüft, ob der Pfad mit `baseRoute` oder `legacyBasePath` beginnt.
- `buildAppHomeUrl()`: Für `scope === 'GLOBAL'`-Apps wird jetzt direkt
  `registryEntry.baseRoute` zurückgegeben (keine literalen
  Doppel-Angaben mehr wie zuvor bei MARITIME). Die `switch`-Anweisung mit
  expliziten Fällen bleibt **nur** für STORE-scoped Apps (DHL, LOYALTY,
  SHOP) bestehen, da deren URL-Formen historisch heterogen sind
  (`/apps/dhl/:id` vs. `/stores/:id/loyalty` vs. `/stores/:id`/`/dashboard`)
  und nicht ohne Risiko vereinheitlicht werden können.

**Ergebnis:** Eine neue **GLOBAL**-App (z.B. `FLEET`) benötigt jetzt
nachweislich **keine** Änderung mehr an `AppAccessService`,
`AppContextService`, `AppLauncherComponent` oder `AppSwitcherComponent` –
nur:

1. Backend: `AppKey`, Controller + `@RequiresApp`
2. Frontend: `APP_REGISTRY`-Eintrag (inkl. optional `legacyBasePath`), Route,
   `AppNavConfig`, Fachkomponenten, i18n

## 7e. Web/iOS/Android-Strategie pro App (Architekturtest, Pilot: DHL)

**Fragestellung:** Können einzelne Apps (DHL, MARITIME, ...) später eigene
Web-/iOS-/Android-Clients bekommen, während Backend, Auth und
App-Entitlements gemeinsam bleiben – ohne das laufende `storeFrontend`
umzubauen? Reine Analyse-/Entscheidungsphase, **keine Code-Änderung**.

### Ist-Zustand

- Ein einziges Angular-CLI-Workspace `storeFrontend/` (`angular.json`:
  1 Projekt, `root: ""`, kein Nx/Monorepo-Tooling).
- **Kein** Capacitor/Ionic/iOS/Android existiert bisher im Repo (`package.json`
  ohne `@capacitor/*`, keine `ios/`/`android/`-Ordner, kein
  `capacitor.config.ts`). Es existiert lediglich ein bereits vorhandenes,
  noch nicht umgesetztes Planungsdokument (`plan-mobileAppStrategy.prompt.md`)
  für eine PWA-/Capacitor-Strategie der **gesamten** Plattform (Storefront),
  nicht pro Fach-App – bestätigt dieselbe technische Grundrichtung
  ("Capacitor wrapt bestehenden Angular-Build 1:1").
- DHL ist bereits sauber isoliert unter `features/dhl/**`, vollständig
  lazy-loaded (`import('./features/dhl/dhl.component')` in `app.routes.ts`),
  nutzt ausschließlich Shared Core (`AuthService`, `AppContextService`,
  `AppNavigationComponent`, `AppAccountComponent`, `AppRegistry`) – guter
  Pilot-Kandidat, da bereits entkoppelt.
- `core/models/*` (u.a. `DhlZone`, `SlotStatus`, `DeliverySettings`, ...) sind
  **reine TS-Interfaces/Enums ohne Angular-Abhängigkeit** – bereits
  framework-agnostisch, portierbar.
- `AppContextService`/`AppAccessService`/`AppRegistry` sind nur dünne
  `@Injectable`-Hüllen um reine Datentransformation (`AppEntitlement[] →
  AppContext[]`), keine Angular-spezifische Logik im Kern.

### Variante A – Capacitor im bestehenden `storeFrontend`

```
storeFrontend/
├── src        (unverändert, alle Apps inkl. DHL/MARITIME)
├── ios        (neu, Capacitor-generiert)
└── android    (neu, Capacitor-generiert)
```

- ✅ Kein Strukturumbau, kein Code-Split, 1:1 derselbe Build/dieselbe Bundles.
- ✅ Schnellster Pilot (Tage, nicht Wochen) – deckt sich mit
  `plan-mobileAppStrategy.prompt.md`.
- ❌ Ein native Client enthält **immer die gesamte Plattform** (Shop, DHL,
  Loyalty, Maritime, ...) – nicht geeignet, falls DHL/Maritime als **eigene,
  einzeln im App Store gelistete** Apps erscheinen sollen (unterschiedliches
  Icon/Name/Bundle-ID/Startroute pro App wäre nur über mehrere
  Capacitor-Configs mit demselben Build lösbar, nicht sauber pro App).
- ❌ Bundle-Größe wächst mit jeder neuen App (kein Tree-Shaking pro
  Fach-App), unabhängig davon, ob der Nutzer nur DHL braucht.

### Variante B – App-spezifische Client-Verzeichnisse

```
apps/
├── dhl/{web,ios,android}
├── maritime/{web,ios,android}
```

- ✅ Saubere Produkt-/Store-Trennung pro App (eigenes Branding, eigene
  Store-Listing, unabhängige Release-Zyklen).
- ❌ Erfordert entweder (a) Code-Duplikation (verboten) oder (b) echtes
  Monorepo-Tooling (npm/yarn-Workspaces oder Nx) + Extraktion von
  Shared-Code in eigene Packages – **das ist der Big-Bang**, den diese Phase
  explizit vermeiden soll.
- ❌ `storeFrontend` müsste umgezogen/aufgeteilt werden, um Duplikation zu
  vermeiden → widerspricht "storeFrontend nicht verschieben/brechen".

### Empfehlung: Hybrid, zweistufig

**Jetzt (risikoarmer Pilot, DHL):** Variante A – Capacitor **direkt** in
`storeFrontend` integrieren (wie in `plan-mobileAppStrategy.prompt.md`
skizziert). Der native Shell-Client lädt beim Start optional eine
DHL-spezifische Startroute (`/apps/dhl/:storeId`) statt der
Storefront-Landingpage – **ein** Capacitor-Projekt, **eine** Bundle, kein
neuer Ordnerbaum, kein Verschieben bestehender Dateien.

**Später (nur bei echtem Bedarf für eigenständige App-Store-Präsenz von
DHL/MARITIME):** Innerhalb desselben Angular-Workspace ein **zweites,
schlankes Angular-Projekt** ergänzen (`ng generate application dhl-mobile` –
Angular-CLI unterstützt mehrere Projekte in einem Workspace, ohne das
bestehende Default-Projekt zu verändern). Dieses Projekt bindet nur
DHL-Routen + den bereits vorhandenen, unveränderten `core`/`shared`-Code ein
(via TypeScript-Pfade, kein Kopieren). Erst wenn mehrere solcher
Mini-Projekte etabliert sind, lohnt sich die Extraktion von
`AppRegistry`/`AppContextService`/`AppNavConfig`/Models in eine echte
Angular-Library (`ng generate library shared-app-factory`) – das ist
bewusst **kein** Teil dieser Phase.

### Shared vs. app-spezifisch vs. client-spezifisch

| Ebene | Beispiel | Wiederverwendbar für Web/iOS/Android? |
|---|---|---|
| Backend/Auth/Entitlements | JWT, `@RequiresApp`, `AppAccessInterceptor` | JA – unverändert, REST-Vertrag ist client-agnostisch |
| Shared Models | `core/models/*.ts` (reine Interfaces/Enums) | JA – 1:1, keine Angular-Abhängigkeit |
| Shared Factory-Logik | `AppRegistry`, `AppContextService`-Kernlogik, `AppNavConfig` | JA – Kernlogik ist bereits reine Datentransformation, nur dünn in `@Injectable` gekapselt |
| Shared UI (Capacitor/Web) | `AppNavigationComponent`, `AppAccountComponent`, `AppSwitcherComponent` | JA für Web + Capacitor (beide sind Angular/DOM); NICHT wiederverwendbar für "echtes" natives iOS/Android (Swift/Kotlin) |
| Fachkomponenten | `features/dhl/**` | JA für Web + Capacitor; bei echtem Nativ-Client müsste die UI-Schicht neu gebaut werden (Businesslogik/API-Calls über REST bleiben gleich) |
| Client-spezifisch | Secure Storage statt `localStorage`, Kamera/Push/Deep-Links, Subdomain-Erkennung (`SubdomainService` → `PlatformService`) | NEIN – pro Client-Typ eigene Implementierung nötig |

**Wichtig:** Capacitor-Apps sind technisch Angular-Web-Apps in einer
nativen WebView – UI-Komponenten sind zwischen Web und Capacitor **1:1**
wiederverwendbar. Nur bei "echtem" nativen iOS/Android (Swift/Kotlin, kein
Capacitor) wäre die komplette UI-Schicht ohnehin neu zu bauen; Backend,
Auth, Entitlements, REST-Verträge und Models blieben identisch nutzbar.

### Migrationsschritte ohne Funktionsverlust (nur DHL-Pilot, noch nicht ausgeführt)

1. `@capacitor/core`, `@capacitor/cli` in `storeFrontend` installieren,
   `npx cap add ios` / `npx cap add android` (rein additiv, kein bestehender
   Code betroffen).
2. `PlatformService` (Web vs. Native) ergänzen – bereits in
   `plan-mobileAppStrategy.prompt.md` skizziert, deckt sich mit dieser Phase.
3. `localStorage` → Secure-Storage-Plugin nur für den nativen Kontext
   (Web-Verhalten unverändert).
4. Optionale native Startroute auf `/apps/dhl/:storeId` (oder generisch: erste
   verfügbare App via `AppAccessService.getPrimaryAppHomeUrl()` – bereits
   vorhanden, keine neue Logik nötig).
5. Erst danach, bei Bedarf: zweites Angular-Projekt (`dhl-mobile`) für einen
   eigenständigen App-Store-Auftritt (Phase 2, separat zu entscheiden).

Keine DB-/Backend-/JWT-/Deployment-Änderung in dieser Phase; keine Datei
wurde verschoben oder umgebaut.

## 7f. DHL Mobile-Factory-Pilot – Inventar & Vorbereitung (M0)

Fortsetzung von 7e: konkrete Bestandsaufnahme für den DHL-Piloten
(Web/PWA/iOS/Android), **keine Code-Änderung** in dieser Phase.

### Mobile-Readiness heute

- `PlatformService` (`core/services/platform.service.ts`) **existiert
  bereits** (aus `plan-mobileAppStrategy.prompt.md` Schritt 2.1 umgesetzt):
  liefert `isNative`, `isMobile`, `isIos`, `isAndroid`, `isRtl`,
  `getPlatformName()`. Erkennt Capacitor über `window.Capacitor?.isNativePlatform()`.
  **Unterscheidet aber noch nicht** explizit `WEB` vs. `PWA` (installierter
  Homescreen-Modus) – nur `nativ vs. nicht-nativ`.
- DHL-Navigation (`DHL_NAV_CONFIG` + `AppNavigationComponent`) ist bereits
  "mobile-ready": reine Konfiguration, keine Hover-only-Interaktionen, kein
  `window.location`/`localStorage`-Zugriff im Navigations-Code selbst.
- `AppRegistry`/`AppContextService`/`AppAccessService` sind bereits
  plattformunabhängig (siehe 7e) – keine Anpassung für Mobile nötig.
- DHL-Fachkomponenten (`features/dhl/**`) verwenden **keinen** direkten
  `window.location`/Subdomain-Zugriff – DHL läuft ausschließlich über den
  Routen-Parameter `/apps/dhl/:storeId`, **nicht** über Subdomain-Erkennung.
  → `SubdomainService`/`isStorefrontSubdomain()` ist für den DHL-Flow
  **irrelevant** (nur für Storefront-Subdomains relevant).

### Web-only Abhängigkeiten (Inventar, nicht angefasst)

| Bereich | Fundstellen | Relevanz für DHL-Pilot |
|---|---|---|
| `window.location`/Subdomain | `subdomain.service.ts`, `store-context.service.ts`, `app.routes.ts`, `storefront/**` | **Nicht** DHL-relevant (nur Storefront/Shop) |
| `localStorage` (JWT/User) | `auth.service.ts` (~10 Stellen: `auth_token`, `currentUser`, `cart_session_id`) | **DHL-relevant** – Login/Session betrifft jede App |
| `localStorage` (sonstige) | 25 weitere Dateien (Cart, Checkout, Settings, Onboarding, DHL-Scan-Audio-Präferenz, ...) | teils DHL-relevant (`dhl-warehouse-plan.component.ts`, `dhl-scan-audio.service.ts` – lokale UI-Präferenzen, unkritisch) |
| Kamera/Scanner (`getUserMedia`) | `barcode-input.component.ts`, `mhd-scanner-test.component.ts` – **wird von DHL genutzt** (`dhl-pickup-parcel`, `dhl-store-parcel`) | **DHL-relevant**, hohe Priorität (Paket-Scan ist Kernfunktion) |
| File Upload (`<input type="file">`) | `image-upload.component.ts` | Nicht Kernbestandteil des DHL-Flows |
| Push Notifications | nicht implementiert (kein Backend-Endpoint, kein SW-Push-Code) | Kein Blocker für M1-Pilot |
| Externe Links (`window.open`, `wa.me`) | `whatsapp-widget`, diverse Storefront-Komponenten | Nicht DHL-relevant |
| Deep Links | nicht implementiert | Für M1 nicht erforderlich (Start direkt in App, kein externer Deep-Link-Eingang nötig) |

### Notwendige Adapter (nur Interfaces/Wrapper, keine Parallelarchitektur)

| Adapter | Zweck | Verhält sich wie |
|---|---|---|
| `StorageAdapter` | `get/set/remove` für Token + User – Web: `localStorage` (unverändert), iOS/Android: Secure Storage/Keychain/Keystore | Wird **innerhalb** von `AuthService` verwendet, ersetzt dort die direkten `localStorage`-Aufrufe – **kein** `MobileAuthService` |
| `PlatformService` (Erweiterung, später) | `WEB \| PWA \| CAPACITOR_IOS \| CAPACITOR_ANDROID` statt nur `isNative` | Bestehender Service wird erweitert, nicht ersetzt |
| `CameraAdapter` | Barcode-Scan via `@capacitor/camera`/Barcode-Scanner-Plugin auf Native, `getUserMedia` auf Web | Wird von `barcode-input.component.ts` intern genutzt, Komponenten-API bleibt gleich |
| `DeepLinkAdapter` | Optional für später: externe Links im nativen Kontext über `@capacitor/browser` statt In-App-Navigation öffnen | Nicht für M1 nötig |
| `PushAdapter` | Optional, erst wenn Push-Feature existiert | Nicht für M1 nötig |

**Bewusst nicht gebaut:** `MobileAuthService`, `MobileEntitlementService`,
`DhlMobileAccessService`, `MobileAppRegistry` – `AuthService`,
`AppContextService`, `AppRegistry`, `AppAccessService` bleiben die einzige
Quelle, nur `StorageAdapter`/`PlatformService`/`CameraAdapter` sind
Plattform-Adapter darunter.

### Empfohlene Capacitor-Struktur (noch nicht angelegt)

```
storeFrontend/
├── src/                 (unverändert)
├── capacitor.config.ts  (neu, additiv)
├── ios/                 (später via `npx cap add ios`)
└── android/             (später via `npx cap add android`)
```

Offene Entscheidungen vor `npx cap add ...` (bewusst noch nicht getroffen):
Capacitor-Version (7.x-Linie, kompatibel mit Node 26/Angular 20 – konkrete
Version erst bei Umsetzung final prüfen), Bundle-IDs (`ma.markt.app` o.ä.),
App-Name/Icon je Plattform, `capacitor.config.ts`-`server.url` bzw.
API-Base-URL (`environment.apiUrl` bleibt Backend-Origin, keine Änderung),
CORS/CSP-Freigabe für `capacitor://localhost`/`https://localhost`,
Secure-Storage-Plugin-Wahl.

### DHL-Pilot-Startflow (mobil)

```
App-Start (Capacitor)
  → AuthService (bestehend, ggf. via StorageAdapter)
  → AppContextService.getAvailableApps() (bestehend, unverändert)
  → AppAccessService.getPrimaryAppHomeUrl() (bestehend, unverändert)
      0 Apps      → /apps/no-access
      genau DHL   → resolveAppEntryUrl(DHL)
                      1 Context  → /apps/dhl/<contextId>
                      >1 Context → /apps/dhl (Context-Auswahl, generisch)
      >1 Apps     → /apps (Launcher)
```

Keine feste Store-ID, kein DHL-Sonderpfad – **exakt derselbe** Redirect-Code
wie im Web (kein neuer Mobile-Flow, nur ggf. eine andere initiale Route in
`capacitor.config.ts`/`index.html`, falls die native App ausschließlich für
DHL vertrieben werden soll).

### Shared vs. native-spezifisch (Kurzfassung, Details in 7e)

Shared (unverändert nutzbar): `AuthService`, `AppContextService`,
`AppRegistry`, `AppAccessService`, `AppNavigationComponent`,
`AppAccountComponent`, `AppSwitcherComponent`, `DHL_NAV_CONFIG`,
DHL-Fachkomponenten, alle `core/models/*`.
Native-spezifisch (nur Adapter): Storage, Kamera-Zugriff im Barcode-Scan,
`PlatformService`-Erweiterung, `capacitor.config.ts`, `ios/`/`android/`.

### Minimale Phase M1 (lokaler Android/iOS-Build, Vorschlag)

1. `@capacitor/core` + `@capacitor/cli` installieren, `capacitor.config.ts`
   anlegen (additiv, kein Bestandscode betroffen).
2. `StorageAdapter`-Interface einführen; `AuthService` intern darauf
   umstellen (Web-Implementierung = 1:1 heutiges `localStorage`-Verhalten,
   **kein** Verhaltensunterschied im Web).
3. `PlatformService` um `WEB | PWA | CAPACITOR_IOS | CAPACITOR_ANDROID`
   erweitern (rein additiv, bestehende `isNative`/`isMobile`-Getter bleiben).
4. `npx cap add android` (zuerst nur Android, geringeres Setup-Risiko als
   iOS/Xcode) + lokaler Testbuild, Start-Route = bestehender
   `getPrimaryAppHomeUrl()`-Flow.
5. Barcode-Scan in `barcode-input.component.ts` hinter `CameraAdapter`
   kapseln (Web-Pfad unverändert `getUserMedia`).
6. Erst danach: `npx cap add ios` (Xcode/Signing-Aufwand separat planen).

### Risiken

- **Auth-Storage-Umstellung** betrifft ausschließlich `auth.service.ts`
  (StorageAdapter), **nicht** die 25 anderen `localStorage`-Stellen – diese
  bleiben bewusst unangetastet (kein Breaking-Change-Risiko dort).
- **Barcode-Scan** ist eine DHL-Kernfunktion – `getUserMedia` funktioniert in
  Capacitor-WebViews grundsätzlich, aber Kamera-Berechtigungen
  (`Info.plist`/`AndroidManifest.xml`) müssen nativ ergänzt werden, sonst
  Blocker für den Piloten.
- **CORS/CSP**: Backend muss `capacitor://localhost` (iOS) und
  `https://localhost` (Android) als Origin zulassen, sonst schlägt jeder
  API-Call fehl – reine Konfigurationsänderung, kein Architektur-Thema,
  aber vor M1 zu klären.
- **Secure-Storage-Plugin-Wahl** (z.B. `@capacitor-community/secure-storage`
  vs. `@capacitor/preferences`) beeinflusst die `StorageAdapter`-Signatur –
  vor Implementierung entscheiden, um Rework zu vermeiden.
- **iOS-Signing/Provisioning** ist unabhängig von dieser Architektur und
  erfordert Apple-Developer-Account-Setup – organisatorisches, kein
  Code-Risiko.

Keine DB-/Backend-/JWT-/Deployment-Änderung; kein `npx cap add`
ausgeführt; keine vollständige Mobile-App erzeugt.

## 7g. Mobile-Factory-Pilot M1 – Status (implementiert)

Fortsetzung von 7f. In M1 wurden **ausschließlich Adapter-Grenzen**
eingeführt – `AuthService`, `AppRegistry`, `AppContextService`,
`AppAccessService` bleiben unverändert die zentrale Quelle. Es wurde
**keine** `MobileAuthService`/`MobileEntitlementService`/
`DhlMobileAccessService`/`MobileAppRegistry` gebaut. Kein `npx cap add
ios/android` ausgeführt, keine DB-/Backend-/JWT-/Deployment-Änderung.

### 1. Storage-Abstraktion (umgesetzt)

Neu: `core/services/storage-adapter.ts` – abstrakte Klasse `StorageAdapter`
(`get`/`set`/`remove`) + `WebLocalStorageAdapter` (Default-Implementierung,
1:1 bisheriges `localStorage`-Verhalten). Provider-Bindung in
`app.config.ts`: `{ provide: StorageAdapter, useClass: WebLocalStorageAdapter }`.

`AuthService` injiziert jetzt `StorageAdapter` statt `localStorage` direkt
zu verwenden. **Entfernte direkte `localStorage`-Zugriffe in
`auth.service.ts`** (alle 9 produktiven Aufrufe, nur Kommentare/Logs
erwähnen `localStorage` noch als Begriff):

| Stelle | Vorher | Nachher |
|---|---|---|
| Konstruktor (User laden) | `localStorage.getItem('currentUser')` | `this.storage.get('currentUser')` |
| `clearSession()` | `localStorage.removeItem('auth_token'/'currentUser'/'cart_session_id')` | `this.storage.remove(...)` (3x) |
| `validateTokenWithBackend()` | `localStorage.setItem('currentUser', ...)` | `this.storage.set('currentUser', ...)` |
| `login()` | `localStorage.setItem('auth_token'/'currentUser', ...)` | `this.storage.set(...)` (2x) |
| `logout()` | `localStorage.removeItem('auth_token'/'currentUser'/'cart_session_id')` | `this.storage.remove(...)` (3x) |
| `isAuthenticated()` | `localStorage.getItem('currentUser')` | `this.storage.get('currentUser')` |
| `setAuthFromStorage()` | `localStorage.getItem('currentUser')` | `this.storage.get('currentUser')` |
| `getToken()` | `localStorage.getItem('auth_token')` | `this.storage.get('auth_token')` |
| `reloadCurrentUser()` | `localStorage.setItem('currentUser', ...)` | `this.storage.set('currentUser', ...)` |

`AuthInterceptor` benötigte **keine** Änderung – er ruft bereits
`authService.getToken()` auf (keine eigene `localStorage`-Nutzung).

**Bewusst nicht angefasst:** Die 25 anderen Dateien mit direktem
`localStorage`-Zugriff (Cart, Checkout, Settings, Onboarding,
`dhl-scan-audio.service.ts` u.a.) – das sind lokale UI-Präferenzen, kein
Teil des Auth-/Entitlement-Flows, Änderung dort war nicht Teil von M1
(Risiko/Aufwand vs. Nutzen für den DHL-Piloten aktuell nicht gerechtfertigt).

### 2. PlatformService (erweitert)

`core/services/platform.service.ts`: neues `PlatformType`-Enum (`WEB`,
`PWA`, `CAPACITOR_IOS`, `CAPACITOR_ANDROID`) + `readonly type`-Property.
`PWA` wird über `matchMedia('(display-mode: standalone)')` /
`navigator.standalone` (iOS) erkannt. Bestehende Getter (`isNative`,
`isMobile`, `isIos`, `isAndroid`, `isRtl`, `getPlatformName()`) bleiben
**unverändert** erhalten (rein additive Erweiterung, kein Breaking Change
für bestehende Nutzer des Service).

### 3. Kamera-/Barcode-Adapter (Grenze geschaffen, Web-Verhalten unverändert)

Neu: `core/services/camera-adapter.ts` – abstrakte Klasse `CameraAdapter`
mit `requestBackCameraStream()` + `WebCameraAdapter` (kapselt exakt den
bisherigen `getUserMedia({ video: { facingMode: { ideal: 'environment' } } })`-Aufruf).
Provider-Bindung in `app.config.ts`.

`barcode-input.component.ts`: "Strategy 2" (direkte `getUserMedia`-Anfrage
nach der Rückkamera) ruft jetzt `this.cameraAdapter.requestBackCameraStream()`
auf statt `navigator.mediaDevices.getUserMedia(...)` direkt. Ergebnis
(Stream + `deviceId`) und nachgelagerte Logik (Stream stoppen, `deviceId`
merken) sind unverändert – **funktional identisch** zum bisherigen Web-Code.

**Bewusst nicht angefasst / weiterhin web-spezifisch:**
- Die ZXing-Dekodierung (`BrowserMultiFormatReader.decodeFromVideoDevice(...)`)
  bleibt vollständig Web-spezifisch – das ist die eigentliche
  Barcode-Erkennung, kein reiner Kamera-Zugriff, und wird bewusst NICHT in
  M1 abstrahiert (zu groß für "nur Adapter-Grenze schaffen").
- `codeReader.listVideoInputDevices()` (Strategy 1/3/4, Geräte-Enumeration)
  bleibt direkter Web-API-Aufruf.
- `mhd-scanner-test.component.ts` verwendet weiterhin direktes
  `getUserMedia` (nicht Teil des DHL-Piloten, nicht angefasst).

### 4. Mobile Entry Flow (verifiziert, keine Änderung nötig)

`AppAccessService.getPrimaryAppHomeUrl()` (unverändert seit 7b/7d) deckt den
geforderten Flow bereits vollständig generisch ab:

```
App-Start → AuthService (jetzt via StorageAdapter)
          → AppContextService.getAvailableApps()
          → AppAccessService.getPrimaryAppHomeUrl()
              0 Apps  → /apps/no-access
              1 App   → resolveAppEntryUrl(app)  (z.B. DHL → /apps/dhl/<contextId>,
                                                    Maritime → /apps/maritime)
              >1 Apps → /apps (Launcher)
```

Keine feste Store-ID, kein DHL-Sonderpfad – identisch zu Web. Für eine
später eigenständig vertriebene DHL-App genügt eine andere Startroute in
`index.html`/`capacitor.config.ts`, **keine** Code-Änderung an
`AppAccessService`/`AppContextService`.

### 5. Capacitor-Plattformordner

**Nicht erzeugt** (wie gefordert) – kein `npx cap add android`/`ios`, kein
`capacitor.config.ts` in dieser Phase.

### Validierung

- Production-Build: **erfolgreich** (`npm run build -- --configuration
  production`, Exit 0), keine neuen Fehler.
- Web-Login/-Logout/Token-Speicherung: Verhalten unverändert, da
  `WebLocalStorageAdapter` 1:1 `localStorage` nutzt (nur Umweg über eine
  zusätzliche Indirektionsebene, keine Logikänderung).
- App-Launcher/Entitlements: unverändert, da `AppContextService`/
  `AppAccessService`/`AppRegistry` nicht angefasst wurden.
- DHL-Barcode-Scan im Web: funktional unverändert (siehe oben, identische
  `getUserMedia`-Parameter/-Reihenfolge, nur hinter `CameraAdapter` gekapselt).

### Was für M2 noch fehlt, bevor `npx cap add android` sicher ist

1. Entscheidung + Implementierung einer echten Secure-Storage-Implementierung
   (`CapacitorSecureStorageAdapter`, z.B. `@capacitor/preferences` oder
   `@capacitor-community/secure-storage`) als zweiter `StorageAdapter`.
2. `@capacitor/core`/`@capacitor/cli` installieren, `capacitor.config.ts`
   anlegen (Bundle-ID, App-Name, `server.url`/API-Base-URL klären).
3. CORS/CSP-Freigabe für `capacitor://localhost` (iOS) /
   `https://localhost` (Android) auf Backend-Seite prüfen (keine
   Architektur-, nur Konfigurationsänderung).
4. Kamera-Berechtigungen (`Info.plist`/`AndroidManifest.xml`) für den
   nativen Container ergänzen, sonst schlägt `CameraAdapter`s künftige
   native Implementierung fehl.
5. Entscheidung, ob/wann `codeReader`/ZXing-Dekodierung ebenfalls hinter
   einen `ScannerAdapter` wandert (für einen echten nativen
   Scanner-Plugin-Pfad) – bewusst nicht Teil von M1.
6. Erst danach `npx cap add android` (zuerst Android, dann iOS).

## 7h. Mobile-Factory-Pilot M2 – Android Capacitor (Status: umgesetzt, Build lokal blockiert)

Ziel dieser Phase: `storeFrontend` erstmals als Android-App startbar machen,
**ohne** zweite DHL-Codebasis und ohne neue Auth-/Entitlement-/Factory-
Strukturen. Ergebnis: Capacitor ist minimal integriert, das Android-Projekt
wurde erzeugt und synchronisiert; ein echter Gradle-Build ist in dieser
Sandbox mangels Android SDK und Internetzugriff (Gradle-Distribution) nicht
möglich – siehe „Verbleibende Blocker" unten.

### 0. Versionscheck (vor Installation)

| Tool | Version | Bewertung |
|---|---|---|
| Node | 26.7.0 | von Angular CLI als "Unsupported" markiert (erfüllt aber `engines.node: ^20.19 \|\| ^22.12 \|\| >=24.0.0`); bereits vor M2 produktiv im Einsatz, kein neues Risiko |
| Angular CLI | 20.3.34 | unverändert |
| TypeScript | ~5.8.0 | unverändert |
| Capacitor | **8.5.2** (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, exakt gepinnt, kein `^`) | `engines.node: >=22.0.0` ✅ erfüllt; keine Angular-Versionsbindung (Capacitor ist Framework-agnostisch); Peer-Dep `@capacitor/android` → `@capacitor/core@^8.5.0` ✅ |
| Java (Gradle-Build) | OpenJDK 21 (Zulu) | vorhanden, kompatibel mit Android Gradle Plugin 8.x |

Entscheidung: **8.5.2 exakt gepinnt** statt `latest`-Tag, um reproduzierbare
Builds sicherzustellen (Capacitor 8 war zum Zeitpunkt der Prüfung die aktuell
unterstützte Major-Linie; ein automatisches `latest` hätte bei künftigen
`npm install` unbemerkt eine neue Major-Version ziehen können).

### 1. Neue Dateien/Ordner

```
storeFrontend/
├── capacitor.config.ts        (neu)
└── android/                   (neu, von `npx cap add android` generiert)
    ├── app/
    │   ├── src/main/AndroidManifest.xml   (CAMERA-Permission ergänzt, siehe unten)
    │   └── src/main/assets/public/…       (kopierte Web-Assets, git-ignored)
    ├── build.gradle, settings.gradle, gradlew(.bat), gradle/…
    └── .gitignore  (von Capacitor generiert; build/, local.properties,
                     app/src/main/assets/public etc. bereits ausgeschlossen)
```

`package.json` erhielt zwei neue Hilfs-Skripte (kein Verhalten geändert):
`cap:sync:android` (Build + `cap sync android`), `cap:open:android`.

`src/**` wurde **nicht** verändert außer den bereits in M1 gemachten
Adapter-Anpassungen; kein zweites Angular-Projekt, kein Ordner-Split.

### 2. App-Identität (bewusste Entscheidung, dokumentiert)

```ts
appId: 'ma.markt.app'
appName: 'markt.ma'
```

**Neutral gewählt, NICHT DHL-spezifisch.** Begründung: Ob langfristig eine
einzige markt.ma-Container-App (ein Client, viele Apps per Entitlement) oder
separate Store-Einträge pro Fach-App (DHL, MARITIME, …) veröffentlicht
werden, ist eine Produkt-/Store-Entscheidung, die noch nicht getroffen wurde.
Eine DHL-Bundle-ID jetzt hart zu verdrahten hätte genau die Parallel-
architektur erzeugt, die die Factory vermeiden soll. Der App-Factory-Flow
(Login → Entitlements → 1 App? direkt / mehrere Apps? `/apps`) entscheidet
zur Laufzeit, welche App angezeigt wird – unabhängig von der nativen
App-Identität. Sollte später „eine App pro Store-Veröffentlichung" gewünscht
sein, ändert sich nur `appId`/`appName` in `capacitor.config.ts` – keine
Code-Änderung in Auth/Registry/Navigation nötig.

### 3. API-Verbindung / CORS

- `environment.prod.ts.apiUrl` zeigt bereits unverändert auf
  `https://api.markt.ma/api` (kein `localhost` in Prod-Config) – der
  Android-Build nutzt automatisch dieselbe Prod-API wie Web.
- `capacitor.config.ts` setzt **kein** `server.url`; die App lädt ihre
  Assets aus dem gebundelten `webDir`, alle HTTP-Aufrufe laufen über
  `HttpClient` gegen `environment.apiUrl`, nicht gegen den Capacitor-Origin.
- **Heutige CORS-Regel** (`WebConfig.corsConfigurationSource()`):
  `http(s)://localhost:*`, `http(s)://*.localhost:*`, `https://markt.ma`,
  `https://*.markt.ma`, `https://claude.ai`.
- **Vom Android-WebView benötigter Origin:** Mit `server.androidScheme:
  'https'` (Default, so gesetzt) sendet Capacitor auf Android den Origin
  **`https://localhost`** (ohne Port). Die bestehende Regel
  `https://localhost:*` verlangt einen Port-Bestandteil nach dem Doppelpunkt
  und matcht `https://localhost` (ohne Port) **nicht** zuverlässig.
- **Minimale, sichere Änderung (empfohlen, noch NICHT vorgenommen):**
  genau einen zusätzlichen Origin-Pattern-Eintrag `"https://localhost"`
  (ohne Wildcard-Port) in `WebConfig.java` ergänzen. Das ist eine
  Ein-Zeilen-Erweiterung einer bereits sehr permissiven Whitelist (localhost
  ist schon heute für alle Ports erlaubt); sie erweitert keine neue Domain,
  sondern schließt nur die exakte Capacitor-Android-Origin-Form ein. Diese
  Backend-Änderung wurde **bewusst nicht automatisch vorgenommen** (Vorgabe:
  „Backend-Änderung nur nach klarer Begründung, nicht blind"), sondern hier
  nur konkret benannt – Umsetzung nach Freigabe in `WebConfig.java`.

### 4. Secure Storage – Analyse statt Hack

> **Update M3a (umgesetzt):** Die hier skizzierte Migrationsstrategie wurde
> vollständig umgesetzt, siehe §7i. Dieser Abschnitt bleibt als
> Entscheidungs-Historie (M2-Analyse) erhalten.

`StorageAdapter` (M1) ist bewusst **synchron** (`get/set/remove` geben
`string | null` bzw. `void` direkt zurück), weil `AuthService` heute an
mehreren Stellen synchron darauf zugreift (Konstruktor, `isAuthenticated()`,
`getToken()` in Guards/Interceptor-Hot-Path).

Recherchierte, aktiv gepflegte Kandidaten für native Secure Storage:

| Plugin | Aktualität | Capacitor-8-kompatibel | API |
|---|---|---|---|
| `@aparajita/capacitor-secure-storage` | v8.0.0, zuletzt 2026-02 aktualisiert | ✅ (Versionslinie folgt Capacitor-Major) | **nur Promise-basiert** (Keychain/Keystore-Zugriff ist zwingend asynchron) |
| `capacitor-secure-storage-plugin` | zuletzt 2026-01 aktualisiert | ✅ (`peerDependencies: "@capacitor/core": ">=8.0.0"`) | ebenfalls Promise-basiert |

**Ergebnis: beide brauchbaren Optionen sind zwingend asynchron** – native
Keychain/Keystore-Zugriffe können nicht synchron über die Capacitor-Bridge
laufen. Ein `CapacitorSecureStorageAdapter` hinter dem heutigen synchronen
`StorageAdapter`-Interface zu verstecken, würde entweder (a) einen
synchronen Cache mit asynchronem Nachladen erfordern (Race-Conditions beim
App-Start, bevor der Cache gefüllt ist) oder (b) `get()` mit einem
Dummy-Wert zurückgeben – beides Hacks mit Sicherheits-/Korrektheitsrisiko.

**Getroffene Entscheidung für M2:** Secure Storage **nicht** implementiert.
Android nutzt in M2 weiterhin `WebLocalStorageAdapter` (WebView-internes
`localStorage`, App-privat isoliert vom System-Browser, aber nicht
Keystore-verschlüsselt).

**Vorgeschlagene, saubere Migration für M3** (nicht jetzt umgesetzt):
1. `StorageAdapter`-Interface auf `Promise<string | null>` /
   `Promise<void>` umstellen (Breaking Change, aber lokal begrenzt).
2. Alle `AuthService`-Aufrufstellen (9 Stellen, siehe §7g) sowie
   `AuthInterceptor`/Guards, die synchron `getToken()` erwarten, auf
   `await`/RxJS anpassen (App-Start bereits async via `APP_INITIALIZER`
   möglich – prüfen).
3. Erst danach `CapacitorSecureStorageAdapter` mit
   `@aparajita/capacitor-secure-storage@8.x` (Keychain/Keystore) als
   zusätzlichen Provider registrieren, ausgewählt per `PlatformService.type`.
4. Migrations-Fallback: beim ersten Start unter Capacitor vorhandene
   `localStorage`-Werte einmalig in Secure Storage übernehmen, dann löschen.

### 5. Kamera / Barcode (M2a)

- `WebCameraAdapter` (M1) läuft unverändert im Android-WebView – Capacitor
  nutzt ein System-WebView (Chromium-basiert), das `getUserMedia` unterstützt.
- `AndroidManifest.xml` wurde ergänzt um `android.permission.CAMERA` sowie
  optionale `android.hardware.camera`/`camera.autofocus`-Features
  (`required="false"`, damit die App auch auf Geräten ohne Kamera installierbar
  bleibt). Ohne diese Permission verweigert die WebView jede
  Kamera-Anfrage unabhängig von einer Laufzeit-Dialogabfrage.
- Capacitors Bridge (`WebViewClient`/`onPermissionRequest`) übernimmt das
  Weiterreichen der Laufzeit-Berechtigungsabfrage an das Android-System,
  sofern die Manifest-Permission gesetzt ist – keine Zusatzimplementierung
  nötig.
- ZXing-Dekodierung/Geräte-Enumeration bleiben unverändert web-spezifisch
  (wie in M1 dokumentiert). Ob ein echter `NativeScannerAdapter` (M2b)
  nötig ist, kann erst nach einem echten Geräte-/Emulator-Test entschieden
  werden (WebView-Kamera-Performance ist nicht in dieser Sandbox testbar).

### 6. PlatformService

Keine Code-Änderung nötig: `PlatformService.detectType()` (aus M1) erkennt
`CAPACITOR_ANDROID` bereits generisch über `window.Capacitor?.isNativePlatform()`
+ User-Agent-Regex, ohne dass Fachkomponenten (DHL o. ä.) selbst Plattform-
Erkennung duplizieren müssten.

### 7. Factory-Prinzip – keine Parallelstruktur

Es wurden **keine** app- oder plattformspezifischen Sonderservices
angelegt. Android nutzt exakt dieselben Bausteine wie Web:

| Baustein | Web | Android (Capacitor) |
|---|---|---|
| `AuthService` | ✅ | ✅ unverändert |
| `AppRegistry` / `AppContextService` / `AppAccessService` | ✅ | ✅ unverändert |
| `AppNavigationComponent` / `AppAccountComponent` | ✅ | ✅ unverändert |
| `StorageAdapter` | `WebLocalStorageAdapter` | `WebLocalStorageAdapter` (M2; Secure-Storage-Adapter erst M3, siehe oben) |
| `CameraAdapter` | `WebCameraAdapter` | `WebCameraAdapter` (identischer Code, läuft im WebView) |
| `PlatformService` | `type = WEB/PWA` | `type = CAPACITOR_ANDROID` |

### 8. Build-/Sync-Ergebnis

| Schritt | Ergebnis |
|---|---|
| `npm install @capacitor/core@8.5.2 @capacitor/android@8.5.2 @capacitor/cli@8.5.2` | ✅ erfolgreich |
| `ng build --configuration production` | ✅ erfolgreich (Exit 0, nur bereits bekannte Budget-/Unused-Warnings) |
| `npx cap add android` | ✅ erfolgreich – `android/` erzeugt, Web-Assets kopiert |
| `npx cap sync android` | ✅ erfolgreich |
| `gradlew tasks` (lokaler Gradle-Build-Test) | ❌ blockiert – siehe unten |

### 9. Verbleibende Blocker (nicht umgangen, sondern dokumentiert)

1. **Kein Android SDK lokal vorhanden** – `ANDROID_HOME`/`ANDROID_SDK_ROOT`
   sind nicht gesetzt, keine SDK-Installation gefunden. Ohne SDK kann das
   Android-Projekt nicht kompiliert werden (Android Gradle Plugin benötigt
   `platforms`, `build-tools`, `platform-tools`).
2. **Kein Internetzugriff aus der Sandbox zu `services.gradle.org`** –
   `gradlew.bat` versucht beim ersten Lauf die Gradle-Distribution
   (`gradle-8.14.3-all.zip`) herunterzuladen; Verbindung läuft in einen
   Timeout. Auch mit `--offline` scheitert der Wrapper-Bootstrap, da noch
   keine lokale Gradle-Distribution im Wrapper-Cache liegt.
3. Java 21 (Zulu, OpenJDK) ist vorhanden und mit Android Gradle Plugin 8.x
   kompatibel – **kein Blocker**, sobald SDK + Netzwerk verfügbar sind.

**Notwendiger externer Schritt (außerhalb dieser Sandbox), danach folgender
Befehl:**
- Android Studio oder Command-Line-Tools + SDK Platform (mind. API 34/35)
  und Build-Tools installieren, `ANDROID_HOME` setzen.
- Danach: `cd storeFrontend/android && .\gradlew.bat assembleDebug`
  (bzw. `npx cap run android` für Emulator/Gerät, sofern `adb`/Emulator
  vorhanden sind).
- Vor einem echten Geräte-/Emulator-Test: CORS-Ergänzung aus Abschnitt 3
  vornehmen, sonst schlagen alle API-Aufrufe aus der App mit einem
  CORS-Fehler fehl (Login-Screen lädt, aber Login-Request wird geblockt).

### 10. Verdikt

Die Factory hält auch für M2 stand: **keine** zweite DHL-Codebasis,
**keine** neue Auth-/Entitlement-Logik. Android ist ein reiner
zusätzlicher Host/Client um denselben `storeFrontend`-Build, gesteuert
ausschließlich über Adapter (`StorageAdapter`, `CameraAdapter`,
`PlatformService`) und eine Config-Datei (`capacitor.config.ts`). Der
einzige noch offene Punkt mit echtem Sicherheitsbezug (Secure Storage) wurde
bewusst nicht gehackt, sondern auf M3 mit einer sauberen
Async-Migrationsstrategie verschoben. Der Android-Build selbst ist lokal
nicht abschließbar, weil SDK/Netzwerk in dieser Umgebung fehlen – kein
Architekturproblem, sondern ein reines Umgebungs-Setup-Thema.

## 7i. Mobile-Factory-Pilot M3a – Secure Storage (umgesetzt)

Setzt die in §7h/4 dokumentierte Analyse um: `AuthService`-Secrets landen auf
Android jetzt im Android Keystore statt im WebView-`localStorage`.

### 1. Gewähltes Plugin

**`@aparajita/capacitor-secure-storage@8.0.0`**

| Kriterium | Bewertung |
|---|---|
| Aktiv gepflegt | ✅ Releases über mehrere Jahre, `8.0.0` erst kürzlich veröffentlicht |
| Capacitor 8 kompatibel | ✅ `peerDependencies`/`dependencies` verlangen `@capacitor/core ^8.0.2` (exakt unser `8.5.2`) |
| Android Keystore | ✅ Android: `EncryptedSharedPreferences` (Keystore-gesichert) |
| iOS Keychain | ✅ iOS: System-Keychain (`ios/`-Quellen bereits im Paket enthalten) |
| Keine Cloud-/Account-Abhängigkeit | ✅ rein lokal/gerätegebunden; optionales iCloud-Sync (`setSynchronize`) ist opt-in und wird **nicht** aktiviert |
| API | `getItem/setItem/removeItem(key, value): Promise<...>` – deckt sich 1:1 mit `StorageAdapter` |

Alternative geprüft: `capacitor-secure-storage-plugin` (ebenfalls
Capacitor-8-fähig) – nicht gewählt, da `@aparajita/...` eine aktivere
Release-Historie, first-class TypeScript-Typisierung und eine schlankere,
zu unserem `StorageAdapter`-Interface passende Low-Level-API
(`getItem/setItem/removeItem`) bietet.

Installiert via `npm install @aparajita/capacitor-secure-storage@8.0.0`;
Android-Modul wird durch `npx cap sync android` automatisch in
`android/app/capacitor.build.gradle` eingebunden
(`implementation project(':aparajita-capacitor-secure-storage')`).

### 2. Sync/Async-Strategie (Kernentscheidung)

`StorageAdapter` ist jetzt **durchgehend async** (`Promise<string | null>` /
`Promise<void>`), weil native Secure Storage (Keystore/Keychain) grundsätzlich
nur async ansprechbar ist. Es gibt **keinen Fake-Sync-Wrapper** und **keinen
Promise-Caching-Hack** über dem nativen Storage selbst.

Die Sync-Anforderung von `AuthService.getToken()` / `isAuthenticated()`
(aufgerufen von `authGuard`, `AuthInterceptor`, `RoleService`,
`CartService`, `CheckoutService`, `CustomerProfileService` u.a.) wird über
einen **In-Memory-Cache in `AuthService`** gelöst:

- `tokenCache: string | null` – wird EINMAL beim App-Start async aus dem
  `StorageAdapter` befüllt (`AuthService.initialize()`), danach ausschließlich
  synchron gelesen (`getToken()` gibt `this.tokenCache` zurück).
- Schreibvorgänge (`login()`, `logout()`, `setSession()`,
  `updateCurrentUser()`, `reloadCurrentUser()`, `validateTokenWithBackend()`)
  aktualisieren `tokenCache` / `currentUserSubject` **sofort synchron**;
  die Persistenz in den `StorageAdapter` läuft parallel async
  (fire-and-forget mit Error-Logging, `void this.storage.set(...)`).
- Dieses Muster ist bewusst KEIN Cache über den Promise selbst (kein
  „Promise-Memoization"), sondern ein gewöhnlicher In-Memory-State, der von
  einer async geladenen Quelle gespeist wird – Standardmuster für native
  Mobile-Apps mit Secure Storage.

**App-Start-Flow (Zielbild umgesetzt):**

```
App Start
  → APP_INITIALIZER: StorageAdapter-Provider ausgewählt (PlatformService)
  → APP_INITIALIZER: AuthService.initialize() (async, await storage.get(...))
  → Token/User in tokenCache / currentUserSubject geladen (oder Session bereinigt, falls abgelaufen)
  → AuthService.authReady$ → true
  → Routing/Guards starten (Angular blockiert Bootstrap bis alle APP_INITIALIZER resolved sind)
```

`AuthService` bekommt dafür einen expliziten Ready-Status:
`authReady$: Observable<boolean>` (zusätzlich zur bestehenden
`currentUser$`), falls Komponenten explizit auf "Auth vollständig
initialisiert" warten wollen (aktuell nicht zwingend nötig, da
`APP_INITIALIZER` bereits das gesamte Bootstrap blockiert).

### 3. Web vs. Mobile Storage (Provider-Switch)

```
StorageAdapter (abstract, async)
  ├── WebLocalStorageAdapter          → WEB / PWA (Default)
  └── CapacitorSecureStorageAdapter   → CAPACITOR_ANDROID (heute), CAPACITOR_IOS (später)
```

`app.config.ts` wählt den Provider zur Laufzeit über `PlatformService.isNative`
(keine Build-Variante, keine zweite App):

```ts
export function provideStorageAdapter(platform: PlatformService, web: WebLocalStorageAdapter, secure: CapacitorSecureStorageAdapter): StorageAdapter {
  return platform.isNative ? secure : web;
}
// { provide: StorageAdapter, useFactory: provideStorageAdapter, deps: [PlatformService, WebLocalStorageAdapter, CapacitorSecureStorageAdapter] }
```

`WebLocalStorageAdapter` bleibt inhaltlich unverändert (`localStorage`), nur
in eine bereits aufgelöste `Promise` gewrappt – **Web-Verhalten ist 1:1
identisch zu vorher**, kein Bruch für bestehende Web-Nutzer.

### 4. Welche Werte brauchen Secure Storage?

Bewusst **nicht** alle bisherigen `localStorage`-Keys blind übernommen:

| Key | Über `StorageAdapter` (Secure Storage auf Android)? | Begründung |
|---|---|---|
| `auth_token` (JWT) | ✅ Ja | Zugangs-Secret |
| `currentUser` (Profil-Cache) | ✅ Ja | an denselben Key/Adapter gekoppelt wie Token, klein, unkritisch mitzusichern |
| `cart_session_id` | ❌ Nein – bleibt in `localStorage` (WebView-intern) | reine Warenkorb-Korrelations-ID, kein Secret, muss nicht Keystore-verschlüsselt sein |
| `last_store_id`, UI-Preferences | ❌ Nein – bleibt in `localStorage` | unkritische UI-/Navigationsdaten |

`AuthService.logout()`/`clearSession()` entfernen `cart_session_id` deshalb
weiterhin direkt via `localStorage.removeItem(...)` (nicht über den
`StorageAdapter`) – unverändert zum bisherigen Verhalten.

### 5. Bereinigte Bypass-Stellen (Bug-Fix, tightly-coupled zu M3a)

Bei der Analyse "welche Stellen hängen an synchroner Token-Verfügbarkeit"
wurden mehrere Stellen gefunden, die `AuthService`/`StorageAdapter` **umgingen**
und direkt `localStorage.setItem('auth_token'/'currentUser', ...)` +
`authService.setAuthFromStorage()` aufriefen (Phone-Auth, anonyme
Store-Erstellung, Save-Email-Flows in Settings/Store-Detail/
Create-Store-Public). Auf Android hätte das bedeutet: Token landet weiterhin
im WebView-`localStorage` statt in Secure Storage – der komplette Zweck von
M3a wäre für diese Flows umgangen worden. Zusätzlich gab es reine
Lese-Bypässe (`localStorage.getItem('auth_token')` in `CartService`,
`CheckoutService`, `CustomerProfileService`, `checkout.component.ts`), die auf
Android nach der Umstellung `null` zurückgegeben hätten.

Alle betroffenen Stellen wurden auf `AuthService` umgestellt:
- Neue öffentliche Methoden `AuthService.setSession(token, user)` (voller
  Login-artiger Zustand) und `AuthService.updateCurrentUser(patch, newToken?)`
  (partielles Update, z.B. nachträgliche E-Mail) ersetzen das
  `localStorage.setItem(...) + setAuthFromStorage()`-Pattern.
- Reine Token-Reads nutzen jetzt durchgehend `authService.getToken()`
  (weiterhin synchron, siehe In-Memory-Cache) statt `localStorage.getItem(...)`.
- Nebeneffekt: ein vorbestehender Bug in `settings.component.ts` (Schreiben
  unter dem Key `auth_user` statt `currentUser` – wurde von `AuthService` nie
  gelesen) wurde dadurch mitbehoben.

### 6. Migration bestehender Sessions

- **Web-Nutzer:** keine Migration nötig – `WebLocalStorageAdapter` liest/schreibt
  weiterhin denselben `localStorage`, Verhalten unverändert.
- **Android:** Secure Storage ist ein separater nativer Store, komplett
  getrennt vom WebView-`localStorage`. Ein vorhandener Android-Login (falls
  z.B. aus einem M2-Testbuild ohne Secure Storage vorhanden) liegt nach dem
  Update im `localStorage`, nicht in Secure Storage → `AuthService.initialize()`
  findet dort keinen Token → User muss sich einmalig neu einloggen.
  **Entscheidung:** kein automatischer Einmal-Migrationsschritt (Token aus
  `localStorage` in Secure Storage kopieren), weil (a) der M2-Android-Build nie
  produktiv ausgeliefert wurde (nur lokale/CI-Debug-APKs, siehe §7h), es also
  keine echten Bestandsnutzer mit Android-Session gibt, und (b) ein
  automatischer Copy-Schritt zusätzliche Komplexität für einen
  Einmalig-relevanten Edge-Case wäre. Erneutes Login ist akzeptiert.

### 7. Tests (manuell verifiziert / durch Code-Review abgesichert)

| Szenario | Ergebnis |
|---|---|
| Web Login | ✅ unverändert – `WebLocalStorageAdapter` = alter `localStorage`-Pfad |
| Web Reload | ✅ `AuthService.initialize()` lädt Token/User async, Promise löst im selben Tick auf wie vorher synchron |
| Web Logout | ✅ `tokenCache`/`currentUserSubject` sofort `null`, Storage-Remove async im Hintergrund |
| Android Login | ✅ (Code-Pfad) `setSession()`/`login()` schreiben synchron in `tokenCache`, async in `CapacitorSecureStorageAdapter` → Keystore |
| Android App Kill/Neustart | ✅ (Code-Pfad) `initialize()` liest Token via `SecureStorage.getItem()` aus Keystore neu ein, vor Routing/Guards |
| Android Logout / Token wirklich entfernt | ✅ `logout()` ruft `storage.remove('auth_token'/'currentUser')` → `SecureStorage.removeItem()` (Keystore-Eintrag gelöscht) |
| `AuthInterceptor` erhält Token weiterhin korrekt | ✅ nutzt weiterhin `authService.getToken()` (synchron, In-Memory) – keine Änderung am Interceptor nötig |
| App-Bootstrap wartet auf Auth-Init | ✅ `APP_INITIALIZER` (`initializeAuth`) blockiert Angular-Bootstrap bis `AuthService.initialize()` resolved ist |

Echter Geräte-/Emulator-Test (adb/Android-Studio) war in dieser Sandbox nicht
möglich (kein Android SDK/Emulator verfügbar, siehe §7h §9) – die
Storage-Bridge-Aufrufe selbst (`SecureStorage.getItem/setItem/removeItem`)
sind aber reine Plugin-Wrapper-Aufrufe ohne eigene Geschäftslogik.

### 8. Build + Sync (verifiziert)

| Schritt | Ergebnis |
|---|---|
| `npm install @aparajita/capacitor-secure-storage@8.0.0` | ✅ erfolgreich |
| `ng build --configuration production` | ✅ erfolgreich (Exit 0, nur bereits bekannte Budget-/Unused-Warnings) |
| `npx cap sync android` | ✅ erfolgreich – Plugin `@aparajita/capacitor-secure-storage@8.0.0` als Android-Plugin erkannt, `capacitor.build.gradle` aktualisiert |
| `gradlew assembleDebug` (lokal) | ❌ weiterhin blockiert (kein Netzwerkzugriff auf `services.gradle.org` in dieser Sandbox, siehe §7h §9) – **kein neues Problem durch M3a**, identischer Blocker wie in M2 |
| `.github/workflows/build-android-apk.yml` | unverändert kompatibel – `npm ci` installiert die neue Dependency aus dem aktualisierten `package-lock.json`, `npx cap sync android` bindet das native Android-Modul automatisch ein |

### 9. Offene Punkte für iOS (CAPACITOR_IOS)

- `CapacitorSecureStorageAdapter` ist bereits iOS-fähig (Plugin enthält
  `ios/`-Quellen, nutzt Keychain) – **kein Code-Änderungsbedarf** in
  `capacitor-secure-storage-adapter.ts` selbst.
- `PlatformService.detectType()` erkennt `CAPACITOR_IOS` bereits (M1),
  `provideStorageAdapter()` behandelt `CAPACITOR_ANDROID`/`CAPACITOR_IOS`
  identisch über `platform.isNative` – keine iOS-spezifische Fallunterscheidung
  nötig.
- Noch offen (kein Blocker für Android-Pilot, aber vor einem echten
  iOS-Build zu klären):
  1. `npx cap add ios` wurde noch nicht ausgeführt (kein `ios/`-Ordner im
     Repo) – analog zu M2 für Android nachzuziehen.
  2. Keychain-`KeychainAccess`-Option (`whenUnlocked` ist Plugin-Default)
     nicht explizit gesetzt/geprüft – Default ist für unseren Use-Case
     (Foreground-App, kein Background-Zugriff nötig) ausreichend, sollte aber
     vor Store-Release bewusst bestätigt werden.
  3. `setSynchronize`/iCloud-Sync bewusst NICHT aktiviert (Default `false`) –
     vor iOS-Rollout sollten Produkt/Security explizit bestätigen, dass Tokens
     NICHT über iCloud zwischen Geräten synchronisiert werden sollen.
  4. Kein Mac/Xcode in dieser Sandbox verfügbar – iOS-Build/Test kann nur auf
     entsprechender Hardware/CI erfolgen (analog zum Android-SDK-Blocker aus
     §7h).

### 10. Verdikt

Kein neuer `MobileAuthService`, keine parallele Mobile-Architektur:
`AuthService` bleibt die einzige Auth-Quelle für Web und Android, nur die
Low-Level-Persistenz ist per `PlatformService`-gesteuertem Provider
austauschbar. `AppRegistry`/`AppContextService`/`AppAccessService` sowie
Tenant/Location/Scanner-Logik wurden nicht angefasst. Die Async-Migration von
`StorageAdapter` wurde vollständig durchgezogen (kein Sync-Fake, kein
Promise-Caching-Hack) und die dafür notwendige Sync-Kompatibilität für
Guards/Interceptor/Fach-Services über einen expliziten In-Memory-Cache in
`AuthService` gelöst.

## 7j. Mobile-Factory-Pilot M4 – iOS Capacitor Pilot (Status: Struktur umgesetzt, Build erfordert Mac/Xcode)

Architekturtest: läuft derselbe `storeFrontend`-Code (gleiche App Factory,
gleicher `AuthService`, gleicher `StorageAdapter`, gleiche APIs) auch als
iOS-App? Ergebnis: **Ja, ohne Code-Änderung an der Kern-Architektur** – es
wurden ausschließlich Plattform-Artefakte hinzugefügt (`ios/`-Ordner,
`@capacitor/ios`-Dependency, `NSCameraUsageDescription`), keine einzige Zeile
in `AuthService`, `StorageAdapter`, `PlatformService`, `CameraAdapter`,
`AppRegistry`/`AppContextService`/`AppAccessService` oder der Android-Struktur
wurde angefasst.

### 1. Analyse vor der Umsetzung

| Geprüft | Ergebnis |
|---|---|
| `capacitor.config.ts` | `appId: 'ma.markt.app'`, `appName: 'markt.ma'` (neutral, siehe §7h) – unverändert übernommen, **keine** neue/zweite Config-Datei für iOS nötig (eine Config gilt für beide Plattformen) |
| Capacitor-Version | `@capacitor/core` / `@capacitor/cli` bereits `8.5.2` (aus M2) – `@capacitor/ios@8.5.2` exakt passend nachinstalliert, keine Versions-Divergenz zwischen den Plattformen |
| `PlatformService` | `detectType()` erkennt `CAPACITOR_IOS` bereits seit M1 generisch (`window.Capacitor.isNativePlatform()` + `/iPhone|iPad|iPod/i`-Regex) – **keine Code-Änderung nötig** |
| `CapacitorSecureStorageAdapter` | plattformneutral geschrieben (nutzt nur die JS/TS-API `SecureStorage.getItem/setItem/removeItem` des Plugins) – **keine Code-Änderung nötig** |
| `CameraAdapter` | `WebCameraAdapter` (M1) nutzt nur Standard-`getUserMedia`, läuft identisch in der iOS-`WKWebView` – **keine Code-Änderung nötig** |
| iOS-Unterstützung des Secure-Storage-Plugins | `@aparajita/capacitor-secure-storage@8.0.0` enthält bereits native iOS-Quellen (`"capacitor": {"ios": {"src": "ios"}}` im Plugin-`package.json`, siehe §M3a) – iOS-Keychain-Implementierung war von Anfang an Teil des in M3a gewählten Plugins, nicht nachgerüstet |

Ergebnis der Analyse: **kompatibel, keine neue Mobile-Architektur nötig** →
iOS-Plattform hinzugefügt.

### 2. Ausgeführte Schritte

```
npm install @capacitor/ios@8.5.2   # neue Dependency, analog @capacitor/android aus M2
ng build --configuration production
npx cap add ios                    # ✅ erfolgreich
npx cap sync ios                   # ✅ erfolgreich
```

Ergebnis-Struktur (wie gefordert, Android unverändert daneben):

```
storeFrontend/
├── android/          (unverändert, M2/M3a)
├── ios/              (NEU, M4)
│   ├── App/
│   │   ├── App/                 (Xcode-App-Target: Info.plist, AppDelegate, Assets, public/ = Web-Build)
│   │   ├── App.xcodeproj/
│   │   └── CapApp-SPM/          (Swift-Package-Manager-Manifest für Capacitor + Plugins)
│   ├── capacitor-cordova-ios-plugins/
│   └── .gitignore
└── capacitor.config.ts   (unverändert – eine Config für Android UND iOS)
```

`npx cap sync ios` hat automatisch erkannt:
`Found 1 Capacitor plugin for ios: @aparajita/capacitor-secure-storage@8.0.0`
– dieselbe Plugin-Version wie unter Android (aus M3a), keine iOS-spezifische
Adapter-Variante nötig.

### 3. App Identity (unverändert, wie gefordert)

`ios/App/App.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER = ma.markt.app;`
`Info.plist` → `CFBundleDisplayName = markt.ma`.

Beides direkt aus `capacitor.config.ts` (`appId`/`appName`) übernommen –
**keine** DHL-spezifische oder sonst app-spezifische Bundle-ID eingeführt,
identisch zur bewussten Entscheidung aus §7h für Android.

### 4. Auth / Secure Storage – Keychain

Kein `IosAuthService`, kein `IosStorageService`. Identischer Flow wie
Android (M3a):

```
AuthService
  → StorageAdapter (abstract, async)
  → CapacitorSecureStorageAdapter   ← plattformneutral, exakt dieselbe TS-Klasse
  → @aparajita/capacitor-secure-storage
      ├── Android: EncryptedSharedPreferences (Keystore)
      └── iOS: System-Keychain
```

`provideStorageAdapter()` (`app.config.ts`) wählt weiterhin nur über
`PlatformService.isNative` (`true` für `CAPACITOR_ANDROID` UND
`CAPACITOR_IOS`) – **keine** Fallunterscheidung Android/iOS im
Provider-Code nötig.

**Zusätzliche iOS-Capabilities/Konfiguration für Keychain?** Geprüft: **keine
nötig.** Keychain-Zugriff (`SecItemAdd`/`SecItemCopyMatching` unter der Haube
des Plugins) ist eine Standard-iOS-API, benötigt weder ein spezielles
Xcode-Capability/Entitlement noch einen App Group/Keychain-Sharing-Eintrag,
solange nur INNERHALB derselben App gelesen/geschrieben wird (kein
Keychain-Sharing zwischen mehreren Apps geplant). Das Plugin nutzt außerdem
standardmäßig `KeychainAccess.whenUnlocked` (Default, siehe Plugin-API) –
für unseren Use-Case (Foreground-Zugriff beim App-Start) ausreichend, siehe
offene Punkte unten.

### 5. CORS – Origin ermittelt, NICHT blind gefixt

Aktuelle `capacitor.config.ts` setzt `server.androidScheme: 'https'`, aber
**kein** `server.iosScheme`. Laut Capacitor-Dokumentation
(`@capacitor/cli` Typdefinition, `iosScheme` `@default 'capacitor'`) ergibt
sich daraus für iOS:

```
Origin (iOS, aktuelle Config) = capacitor://localhost
Origin (Android, aktuelle Config, unverändert seit M2) = https://localhost
```

**Wichtiger Befund:** Das Backend (`WebConfig.java`,
`corsConfigurationSource()`) hat in M2 den Eintrag `"https://localhost"`
bewusst mit dem Kommentar *"Capacitor Android/iOS WebView"* ergänzt – der
Kommentar geht implizit davon aus, dass iOS ebenfalls `https://localhost`
sendet. **Das stimmt mit der aktuellen Config nicht** (iOS sendet
`capacitor://localhost`, ein anderer Origin-String). Es wurde **keine**
Backend-CORS-Regel blind ergänzt oder der Kommentar korrigiert – das ist
bewusst dem ersten echten iOS-Gerätetest vorbehalten (siehe unten). Zwei
mögliche, gleichwertig einfache spätere Fixes, ausschließlich falls ein
echter Test tatsächlich einen CORS-Fehler zeigt:
1. `server.iosScheme: 'https'` in `capacitor.config.ts` ergänzen (Frontend-seitig,
   dann matcht der bestehende `"https://localhost"`-CORS-Eintrag auch iOS,
   **keine** Backend-Änderung nötig), ODER
2. `"capacitor://localhost"` zusätzlich in `WebConfig.java` aufnehmen
   (Backend-seitig, falls Variante 1 aus anderen Gründen nicht gewünscht ist).

Keine der beiden Optionen wurde jetzt umgesetzt – reine Dokumentation des
Ist-Zustands, wie vom Auftrag gefordert.

### 6. Kamera / Barcode (iOS)

- `WebCameraAdapter` (unverändert, M1) läuft identisch in der iOS-`WKWebView`
  (WebKit unterstützt `getUserMedia` inkl. `facingMode: 'environment'`).
- **Notwendige iOS-Permission:** `NSCameraUsageDescription` in
  `ios/App/App/Info.plist` – **war im von `cap add ios` generierten Info.plist
  NICHT enthalten** und wurde ergänzt (analog zur
  `android.permission.CAMERA`-Ergänzung in M2a). Ohne diesen Key verweigert/
  crasht iOS jede `getUserMedia`-Anfrage aus der WKWebView, unabhängig von
  einer Laufzeit-Dialogabfrage – identisches Muster zum Android-Manifest-Befund
  aus M2a.
- Kein `NativeScannerAdapter`/keine native Scanner-Implementierung ergänzt –
  `WebCameraAdapter` ist für den Pilot ausreichend, identisch zur
  Android-Entscheidung in M2a.

### 7. Build-/Sync-Ergebnis

| Schritt | Ergebnis |
|---|---|
| `npm install @capacitor/ios@8.5.2` | ✅ erfolgreich |
| `ng build --configuration production` | ✅ erfolgreich (Exit 0, bereits bekannte Budget-/Unused-Warnings) |
| `npx cap add ios` | ✅ erfolgreich – `ios/`-Ordner erzeugt, Web-Assets nach `ios/App/App/public` kopiert |
| `npx cap sync ios` | ✅ erfolgreich – Plugin `@aparajita/capacitor-secure-storage@8.0.0` als iOS-Plugin erkannt, `Package.swift` aktualisiert |
| Xcode-Build (`xcodebuild`/Xcode-IDE) | ❌ nicht ausführbar – **kein Mac/Xcode in dieser Sandbox verfügbar** (Windows-Umgebung) |

**Was automatisch vorbereitet wurde (ohne Mac):**
- Vollständige Xcode-Projektstruktur (`App.xcodeproj`, `Info.plist`,
  `AppDelegate`/`SceneDelegate`-Referenzen, `LaunchScreen`/`Main.storyboard`).
- Web-Assets bereits nach `ios/App/App/public` kopiert (Production-Build).
- Plugin-Integration bereits vollständig verdrahtet: Capacitor 8 nutzt
  standardmäßig **Swift Package Manager** statt CocoaPods
  (`ios/App/CapApp-SPM/Package.swift`, automatisch von `cap sync` geschrieben)
  – `@aparajita/capacitor-secure-storage` ist dort bereits als lokale
  Package-Dependency eingetragen. **Kein Podfile, kein `pod install`
  nötig** – das wäre auf einem Mac ohnehin CocoaPods-spezifisches Tooling
  gewesen, entfällt hier komplett.
- `NSCameraUsageDescription` in `Info.plist` ergänzt.

**Was zwingend einen Mac/Xcode benötigt (kein Workaround möglich):**
1. Auflösen der Swift-Package-Manager-Dependencies (`capacitor-swift-pm`,
   Plugin-Package) – erfordert Xcode/`xcodebuild`, keine reine CLI-Aktion
   unter Windows/Linux.
2. Erster Xcode-Build (Debug/Simulator oder Gerät) – `xcodebuild`/Xcode-IDE
   läuft ausschließlich auf macOS.
3. Code-Signing (Development-Team/Provisioning Profile) für Simulator ist
   nicht zwingend nötig, für ein echtes iPhone jedoch schon (Apple
   Developer Account + Signing-Zertifikat).
4. Echter Geräte-/Simulator-Test der Keychain-Persistenz, Kamera-Permission-
   Dialog und CORS-Verhalten (siehe §5) – analog zum offenen Android-
   Emulator-Test aus §7h/§7i.

### 8. GitHub Actions – noch kein Workflow

Es wurde **kein** `build-ios.yml` angelegt. Wie beauftragt zunächst nur
Beurteilung: ein iOS-Build-Workflow (Debug-Build für Simulator, analog zu
`build-android-apk.yml`) würde einen **macOS-Runner**
(`runs-on: macos-14`/`macos-latest`) benötigen – GitHub-gehostete
macOS-Runner sind grundsätzlich verfügbar, aber (a) deutlich teurer als
Ubuntu-Runner (höherer Minuten-Multiplikator) und (b) für einen reinen
Simulator-Debug-Build ohne Signing bereits ausreichend, für ein
installierbares IPA/TestFlight/App-Store-Artefakt wäre zusätzlich ein
Apple-Signing-Setup (Zertifikat + Provisioning Profile als GitHub Secrets)
nötig. Empfehlung: `build-ios.yml` erst anlegen, wenn ein echter
Mac-Gerätetest (§7) die grundsätzliche Lauffähigkeit bestätigt hat – vorher
wäre ein CI-Workflow nur Kostenfaktor ohne zusätzlichen Erkenntnisgewinn
gegenüber der lokalen Struktur-Analyse hier.

### 9. Was zwischen Android und iOS tatsächlich gemeinsam geblieben ist

| Baustein | Android | iOS | Gemeinsam? |
|---|---|---|---|
| `AuthService` | ✅ | ✅ | ✅ 100 % identischer Code |
| `StorageAdapter` (abstract) | ✅ | ✅ | ✅ 100 % identischer Code |
| `CapacitorSecureStorageAdapter` | ✅ (Keystore) | ✅ (Keychain) | ✅ 100 % identischer TS-Code, nur native Implementierung im Plugin unterscheidet sich |
| `PlatformService` | `type = CAPACITOR_ANDROID` | `type = CAPACITOR_IOS` | ✅ dieselbe Klasse, nur Enum-Wert unterscheidet sich |
| `CameraAdapter` (`WebCameraAdapter`) | ✅ | ✅ | ✅ 100 % identischer Code |
| `AppRegistry`/`AppContextService`/`AppAccessService` | ✅ | ✅ | ✅ unverändert, nicht angefasst |
| `capacitor.config.ts` | ✅ | ✅ | ✅ eine gemeinsame Datei, keine Duplikation |
| App Identity (`appId`/`appName`) | `ma.markt.app` / `markt.ma` | `ma.markt.app` / `markt.ma` | ✅ identisch |
| Nativer Storage-Backend | EncryptedSharedPreferences | Keychain | ⚠️ unterschiedlich (erwartet – jeweilige Plattform-Norm), aber hinter identischem `StorageAdapter`-Vertrag versteckt |
| WebView-Origin | `https://localhost` | `capacitor://localhost` (aktuell, siehe §5) | ⚠️ unterschiedlich – dokumentierter, noch nicht behobener CORS-Punkt |
| Manifest/Plist-Permissions | `AndroidManifest.xml` (`CAMERA`) | `Info.plist` (`NSCameraUsageDescription`) | ⚠️ plattform-native Deklarationsform unterschiedlich, aber gleiche fachliche Berechtigung (Kamera) |

### 10. Verdikt

Die Factory hält auch für M4 stand: **keine** zweite Mobile-Codebasis,
**kein** `IosAuthService`/`IosStorageService`, **keine** iOS-spezifische
Sonderbehandlung in `AuthService`/`StorageAdapter`/`PlatformService`/
`CameraAdapter`. iOS ist – wie Android in M2/M3a – ein reiner zusätzlicher
Host/Client um denselben `storeFrontend`-Build, gesteuert ausschließlich über
dieselben Adapter und dieselbe `capacitor.config.ts`. Der Android-Ordner
wurde nicht verändert. Zwei offene, bewusst nicht blind gefixte Punkte bleiben
für den ersten echten Gerätetest: (1) CORS-Origin-Diskrepanz
`capacitor://localhost` vs. erwartetem `https://localhost` (§5), (2)
tatsächlicher Xcode-Build/Signing, der zwingend einen Mac erfordert (§7).

## 7k. Mobile-Factory-Pilot M4 – iOS TestFlight-Pipeline (Status: Workflow vorbereitet, noch nicht mit echten Secrets gelaufen)

Ziel: analog zu `build-android-apk.yml` (M2.2) ein GitHub-Actions-Workflow,
der aber statt eines unsignierten Debug-APKs einen **signierten** iOS-Build
erzeugt und automatisch zu **TestFlight** hochlädt (nur interne Verteilung,
kein App-Store-Release). Datei: `.github/workflows/build-ios-testflight.yml`.

### 1. Analyse vor der Umsetzung

| Geprüft | Ergebnis |
|---|---|
| Existiert `ios/` bereits? | Ja (aus M4-Grundsetup) – **kein** erneutes `cap add ios` nötig |
| Bundle-ID | `ma.markt.app` (aus `capacitor.config.ts`, siehe §7j) – wird 1:1 im `ExportOptions.plist` (`provisioningProfiles`-Mapping) referenziert |
| `@aparajita/capacitor-secure-storage` iOS/Keychain | Sauber unterstützt, keine Änderung nötig (siehe §7j, Punkt 4) – dieser Workflow ändert nichts an Storage/Auth, baut nur die native Hülle |
| Info.plist Kamera-Eintrag | `NSCameraUsageDescription` bereits vorhanden (§7j, Punkt 6) – nichts zu tun |
| Xcode-Version / Deployment-Target | `ios/App/CapApp-SPM/Package.swift`: `swift-tools-version: 5.9`, `platforms: [.iOS(.v15)]`; `project.pbxproj`: `IPHONEOS_DEPLOYMENT_TARGET = 15.0` → **Xcode 15 oder neuer** erforderlich. Workflow nutzt `maxim-lobanov/setup-xcode@v1` mit `xcode-version: latest-stable`, um automatisch die neueste auf dem `macos-14`-Runner vorinstallierte stabile Version zu wählen (kann später auf eine konkrete Version gepinnt werden, falls Apple ein Mindest-SDK für Submissions vorschreibt) |
| **Neuer Befund:** Shared Xcode-Scheme | `cap add ios` legt den Scheme "App" standardmäßig **nicht** als "Shared" an (keine Datei unter `xcshareddata/xcschemes/` im Repo). Ohne einen einmalig auf einem Mac freigegebenen und committeten Scheme kann `xcodebuild -scheme App` in CI den Scheme nicht finden. Dies ist ein zusätzlicher, bisher nicht dokumentierter Mac-Vorbehalt (siehe Abschnitt 5 unten) – der Workflow prüft das per Preflight-Step und bricht kontrolliert mit Anleitung ab, statt einen kryptischen `xcodebuild`-Fehler zu zeigen |

### 2. Pipeline (Trigger: nur `workflow_dispatch`)

```
Checkout
→ npm ci (Node 22, --legacy-peer-deps, identisch zu Android-Workflow)
→ Angular Production Build (npm run build:prod)
→ npx cap sync ios
→ Xcode-Version wählen (latest-stable, Xcode 15+)
→ Preflight: Secrets vorhanden? Shared Scheme committet?
→ Distribution-Zertifikat in temporäre CI-Keychain importieren
→ Provisioning Profile installieren (UUID automatisch ermittelt)
→ xcodebuild archive (Release, CODE_SIGN_STYLE=Manual)
→ ExportOptions.plist schreiben (method: app-store-connect)
→ xcodebuild -exportArchive → .ipa
→ .ipa als GitHub-Actions-Artifact hochladen (zusätzlich zu TestFlight, 14 Tage)
→ xcrun altool --upload-app → App Store Connect / TestFlight
→ temporäre Keychain löschen (immer, auch bei Fehler)
```

Bewusst **kein** automatischer Trigger (`push`/`paths`) wie bei
`build-android-apk.yml` – iOS-Builds verbrauchen deutlich teurere
macOS-Runner-Minuten und lösen einen echten TestFlight-Upload aus; das soll
nicht versehentlich bei jedem Push passieren. Nur `workflow_dispatch`
("Run workflow" manuell in der Actions-UI).

### 3. Signing-/Provisioning-Strategie (empfohlene, "sauberste" CI-Variante)

Bewusst **manuelles Signing** (`CODE_SIGN_STYLE=Manual`), nicht "Automatic":
Automatic Signing ist für den interaktiven Xcode-Workflow mit eingeloggter
Apple-ID gedacht und in einem headless CI-Runner weder praktikabel noch
deterministisch reproduzierbar.

Gewählter Ansatz: **Zertifikat + Profil als base64-Secrets, Import in eine
temporäre, isolierte CI-Keychain** (Standardmuster aus Apples eigener
CI-Dokumentation und dem offiziellen `apple-actions/import-codesign-certs`-
Pattern, hier aber ohne zusätzliche Third-Party-Action nachgebaut, um keine
weitere externe Abhängigkeit einzuführen):

- **Nicht gewählt:** Fastlane `match` (eigenes privates Git-Repo für
  Zertifikate/Profile) – für einen einzelnen Piloten zusätzliche
  Infrastruktur (weiteres privates Repo, Fastlane-Toolchain, `Matchfile`)
  ohne klaren Mehrwert gegenüber direktem `xcodebuild`.
- **Nicht gewählt:** Automatic Signing mit App-Store-Connect-API-Key
  (`xcodebuild -allowProvisioningUpdates` OHNE manuelles Zertifikat) – zwar
  von Apple/Xcode 13+ unterstützt, aber deutlich fragiler in CI (Xcode
  versucht dabei selbst, Profile über die API anzulegen/zu ändern, was bei
  bereits bestehenden Profilen zu Seiteneffekten führen kann) und schwerer
  nachzuvollziehen als ein explizit vorab erzeugtes Profil.
- **Gewählt:** Manuelles Signing mit vorab in Xcode/Developer-Portal erzeugtem
  Distribution-Zertifikat + App-Store-Provisioning-Profil, beide als
  base64-Secrets hinterlegt, Import/Cleanup vollständig innerhalb des
  Workflow-Laufs (temporäre Keychain, wird am Ende immer gelöscht).

Der Upload selbst läuft über den **App Store Connect API Key**
(`xcrun altool --upload-app --apiKey ... --apiIssuer ...`), NICHT über ein
persönliches Apple-Passwort/App-Specific-Password – kein 2FA-Prompt in CI
möglich/nötig, Key ist jederzeit in App Store Connect widerrufbar.

### 4. Benötigte GitHub Secrets (noch nicht angelegt)

| Secret | Zweck | Herkunft |
|---|---|---|
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect API Key – Key-ID | App Store Connect → Users and Access → Integrations → App Store Connect API |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect API Key – Issuer-ID | dieselbe Seite |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Inhalt der `AuthKey_<KEY_ID>.p8`-Datei (roher Text) | Download beim Erzeugen des API-Keys (nur einmal möglich!) |
| `APPLE_TEAM_ID` | 10-stellige Apple Developer Team-ID | developer.apple.com → Membership |
| `IOS_DIST_CERTIFICATE_P12_BASE64` | base64-kodiertes `.p12`-Export des "Apple Distribution"-Zertifikats (inkl. privatem Schlüssel) | Keychain Access (Mac) → Zertifikat exportieren |
| `IOS_DIST_CERTIFICATE_PASSWORD` | Passwort des `.p12`-Exports | selbst vergeben beim Export |
| `IOS_PROVISIONING_PROFILE_BASE64` | base64-kodiertes App-Store-`.mobileprovision`-Profil für `ma.markt.app` | developer.apple.com → Profiles, oder Xcode-Export |
| `IOS_CI_KEYCHAIN_PASSWORD` | beliebiges Zufallspasswort NUR für die temporäre CI-Keychain | z. B. `openssl rand -hex 32`, kein Apple-Bezug |

Keines dieser Secrets wurde in diesem Schritt angelegt oder hartcodiert –
der Workflow prüft ihre Anwesenheit per Preflight-Step und bricht ohne sie
kontrolliert mit einer Liste der fehlenden Namen ab.

### 5. Was zusätzlich einen Mac benötigt (über §7j hinaus)

Zusätzlich zu den bereits in §7j dokumentierten Punkten (SPM-Package-
Auflösung, erster Xcode-Build, Code-Signing-Infrastruktur) ist für diese
Pipeline **einmalig** auf einem Mac nötig:

1. Distribution-Zertifikat im Apple Developer Portal erzeugen (oder
   bestehendes verwenden) und als `.p12` mit Passwort exportieren.
2. App-Store-Provisioning-Profil für `ma.markt.app` erzeugen und
   herunterladen.
3. App Store Connect API Key erzeugen und `.p8`-Datei sichern (nur beim
   Erzeugen einmal herunterladbar).
4. **Xcode-Scheme "App" auf "Shared" setzen** (`Product → Scheme → Manage
   Schemes → Shared`-Haken) und die dadurch entstehende Datei
   `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` ins Repo
   committen – ohne diesen Schritt bricht der Workflow im Preflight ab.
5. Einmaliger Eintrag der App (Bundle-ID `ma.markt.app`) in App Store
   Connect ("Neue App" anlegen), da `xcrun altool --upload-app` einen
   bereits in App Store Connect existierenden App-Datensatz für diese
   Bundle-ID voraussetzt.

Erst nach diesen fünf einmaligen, manuellen Mac-/Portal-Schritten kann der
Workflow per `workflow_dispatch` einen vollständigen, echten Testlauf
durchführen.

### 6. Was unverändert bleibt

- `build-android-apk.yml` wurde **nicht** angefasst – Android-Pipeline läuft
  exakt wie zuvor (M2.2/M3a).
- Backend, JWT, DB, Entitlements, `AppRegistry` – unverändert.
- Angular-Code, `AuthService`, `StorageAdapter`, `CameraAdapter`,
  `PlatformService` – unverändert; die Pipeline baut ausschließlich die
  bereits in M4 (§7j) erzeugte native `ios/`-Hülle.
- **Kein** App-Store-Release, **keine** externe TestFlight-Freigabe – nur
  interner Upload/interne Tester-Gruppe (Freigabe für externe Tester
  erfordert zusätzlich einen manuellen Beta-App-Review-Schritt in App Store
  Connect, der hier bewusst nicht automatisiert wird).

### 7. Verdikt

Pipeline ist vollständig vorbereitet und dokumentiert, aber **noch nicht mit
echten Secrets gelaufen** (kein Apple Developer Account/Zertifikat/Profil in
dieser Sandbox verfügbar, wie erwartet). Sobald die fünf Schritte aus
Abschnitt 5 einmalig auf einem Mac durchgeführt und die acht Secrets aus
Abschnitt 4 im Repository hinterlegt sind, kann der Workflow über
"Actions → Build iOS TestFlight → Run workflow" gestartet werden und sollte
ohne weitere Codeänderung einen Build direkt in TestFlight liefern.

## 7l. Mobile-Factory-Pilot M4 – TestFlight-Pipeline ausführbar machen (Setup-Checkliste)

Ziel dieses Schritts: **keine neue iOS-Architektur**, sondern die bereits
vorbereitete Pipeline (§7k) so weit bringen, dass sie nach Eintragen der
Secrets tatsächlich `Run workflow → Archive → IPA → Upload → TestFlight`
durchläuft. Alle hier gemachten Repo-Änderungen sind minimal und rein
CI-technisch (Xcode-Scheme-Datei, Upload-Kommando) – kein Angular-/Auth-/
Storage-/Entitlement-Code wurde angefasst.

### 1. Welches Xcode-Projekt wird verwendet?

`storeFrontend/ios/App/App.xcodeproj` – **kein** `.xcworkspace` vorhanden
(geprüft: `find ios -name "*.xcworkspace"` findet nur das interne, von
Xcode automatisch verwaltete `App.xcodeproj/project.xcworkspace`, kein
eigenständiges CocoaPods-Workspace). Grund: Capacitor 8 verdrahtet Plugins
per **Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`, siehe
§7j) direkt in das `.xcodeproj` – es gibt kein `Podfile`, keinen `pod
install`-Schritt. Der Workflow baut deshalb korrekt mit
`xcodebuild -project App.xcodeproj -scheme App ...` (nicht `-workspace`).

### 2. War der App-Scheme wirklich nicht shared/committed?

Ja, bestätigt: vor diesem Schritt existierte kein
`ios/App/App.xcodeproj/xcshareddata/xcschemes/*.xcscheme` im Repo (nur das
projekt-interne `project.xcworkspace/xcshareddata`, das nichts mit
Build-Schemes zu tun hat). `cap add ios` legt für den generierten
Einzel-Target "App" standardmäßig nur eine **user-lokale** (nicht
committete) Scheme-Einstellung an.

### 3. Konnte der Scheme ohne Xcode-Neustart erzeugt werden?

**Ja – minimal umgesetzt, kein Mac/Xcode nötig.** Geprüft in
`project.pbxproj`: Capacitors iOS-Template verwendet feste, seit Jahren
unveränderte Platzhalter-UUIDs (`504EC3031FED79650016851F` für den
`PBXNativeTarget "App"`, `504EC2FC1FED79650016851F` für `PBXProject`),
keine bei jedem `cap add ios`-Lauf neu zufällig generierten IDs. Damit ließ
sich die Datei

```
ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme
```

von Hand nach dem Standard-Xcode-Scheme-XML-Format anlegen (Build-, Test-,
Launch-, Profile-, Analyze- und Archive-Action, jeweils mit
`BuildableReference` auf `BlueprintIdentifier = 504EC3031FED79650016851F`,
`BuildableName = App.app`, `ReferencedContainer =
container:App.xcodeproj`) – **committet, kein Xcode-Start nötig.**

Absicherung falls sich das Template künftig ändert (neue
Capacitor-Major-Version mit anderen UUIDs): Der Preflight-Step des
Workflows prüft nur, dass die Datei existiert, nicht ihren Inhalt gegen das
aktuelle `project.pbxproj`. Falls `xcodebuild` trotz vorhandener Datei einen
Fehler wie `"scheme App is not currently configured"` meldet, bedeutet das:
die UUIDs stimmen nicht mehr überein → dann tatsächlich einmalig auf einem
Mac nötig: `App.xcodeproj` in Xcode öffnen → *Product → Scheme → Manage
Schemes* → Haken bei **Shared** für "App" setzen → Xcode schreibt die Datei
automatisch neu → committen.

### 4. Bundle-ID-Konsistenz (`ma.markt.app`)

Geprüft, überall identisch:

| Ort | Wert |
|---|---|
| `capacitor.config.ts` (`appId`) | `ma.markt.app` |
| `ios/App/App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`, beide Build-Configs Debug+Release) | `ma.markt.app` |
| `ios/App/App/Info.plist` (`CFBundleIdentifier`) | `$(PRODUCT_BUNDLE_IDENTIFIER)` → löst zur Build-Zeit zu `ma.markt.app` auf |
| `android/app/build.gradle` (`applicationId`, zum Vergleich) | `ma.markt.app` (unverändert, M2) |
| `.github/workflows/build-ios-testflight.yml` (`ExportOptions*.plist` → `provisioningProfiles`-Mapping) | Schlüssel `ma.markt.app` |

Keine Abweichung, keine Änderung nötig.

### 5. Einmalig anzulegende Apple-Objekte

Alle fünf Schritte sind einmalige, manuelle Aktionen im Apple Developer
Portal bzw. App Store Connect (kein CI/Repo-Vorgang):

1. **App ID** (developer.apple.com → Certificates, IDs & Profiles →
   Identifiers → "+") – Bundle-ID **explizit** (nicht Wildcard) `ma.markt.app`
   registrieren. Capabilities: für den aktuellen Funktionsumfang (Auth via
   Secure Storage/Keychain, Kamera) sind **keine** zusätzlichen Capabilities
   nötig (siehe §7j Punkt 4 – Keychain-Zugriff innerhalb derselben App
   braucht kein Capability-Flag).
2. **App Store Connect App** (appstoreconnect.apple.com → Apps → "+" → New
   App) – Plattform iOS, Bundle-ID `ma.markt.app` aus Schritt 1 auswählen,
   Name z. B. "markt.ma". Ohne diesen Eintrag lehnt der Upload (Schritt
   unten) die Bundle-ID ab, da noch keine App dafür existiert.
3. **Distribution Certificate** (developer.apple.com → Certificates → "+" →
   "Apple Distribution") – lokal (auf einem Mac oder über Keychain
   Access + CSR) erzeugen, herunterladen, in Keychain Access importieren,
   dann **als `.p12` mit Passwort exportieren** (Rechtsklick auf das
   Zertifikat in Keychain Access → "Exportieren").
4. **App Store Provisioning Profile** (developer.apple.com → Profiles →
   "+" → "App Store Connect" (Distribution)) – App ID aus Schritt 1 und
   Zertifikat aus Schritt 3 auswählen, herunterladen (`.mobileprovision`).
5. **App Store Connect API Key** (appstoreconnect.apple.com → Users and
   Access → Integrations → App Store Connect API → "+") – Rolle mind.
   "App Manager" oder "Developer", herunterladen liefert eine
   `AuthKey_<KEY_ID>.p8`-Datei (**nur einmal herunterladbar**, sofort
   sichern).

### 6. GitHub Secrets – exakte Anleitung pro Secret

| Secret | Wo bei Apple finden/erzeugen | Format | base64 nötig? | PowerShell-Beispiel (Windows) |
|---|---|---|---|---|
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect → Users and Access → Integrations → App Store Connect API → Spalte "Key ID" (z. B. `2X9R4HXF34`) | reiner String, 10 Zeichen | Nein | – (Wert direkt aus der Tabelle kopieren) |
| `APP_STORE_CONNECT_ISSUER_ID` | dieselbe Seite, oben als "Issuer ID" angezeigt (UUID-Format, z. B. `69a6de70-...`) | UUID-String | Nein | – (Wert direkt kopieren) |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Inhalt der beim Erzeugen des Keys heruntergeladenen `AuthKey_<KEY_ID>.p8` | **roher Text** der Datei inkl. `-----BEGIN PRIVATE KEY-----`/`-----END PRIVATE KEY-----`-Zeilen | **Nein** – Workflow schreibt den Secret-Wert 1:1 in eine `.p8`-Datei | `Get-Content .\AuthKey_XXXX.p8 -Raw \| Set-Clipboard` (Inhalt danach direkt als Secret-Wert einfügen) |
| `APPLE_TEAM_ID` | developer.apple.com → Account → Membership Details → "Team ID" (10-stelliger alphanumerischer Code, z. B. `AB12CD34EF`) | reiner String | Nein | – (Wert direkt kopieren) |
| `IOS_DIST_CERTIFICATE_P12_BASE64` | Export aus Schritt 5.3 (`Distribution.p12`) | base64-kodierter Binärinhalt der `.p12`-Datei | **Ja** | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("Distribution.p12")) \| Set-Clipboard` |
| `IOS_DIST_CERTIFICATE_P12_PASSWORD` | selbst vergebenes Passwort beim `.p12`-Export in Keychain Access (Dialog fragt danach) | reiner String | Nein | – (selbst gewähltes Passwort, sicher merken/in Passwortmanager ablegen) |
| `IOS_PROVISIONING_PROFILE_BASE64` | Download aus Schritt 5.4 (`.mobileprovision`) | base64-kodierter Binärinhalt der Profildatei | **Ja** | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AppStore.mobileprovision")) \| Set-Clipboard` |
| `IOS_CI_KEYCHAIN_PASSWORD` | **kein** Apple-Bezug – frei wählbares Einmal-Passwort NUR für die temporäre CI-Keychain dieses Workflow-Laufs | reiner String | Nein | `[System.Web.Security.Membership]::GeneratePassword(32,8)` (oder beliebiger Passwortgenerator) |

**Hinweis zur Umbenennung:** In §7k hieß das Zertifikat-Passwort-Secret noch
`IOS_DIST_CERTIFICATE_PASSWORD` – konsequent zum Namensschema der übrigen
`IOS_*`-Secrets in `build-ios-testflight.yml` auf `IOS_DIST_CERTIFICATE_P12_PASSWORD`
umbenannt (Workflow-Datei entsprechend angepasst, keine zwei Namen mehr im
Umlauf).

Secrets anlegen unter: GitHub-Repo → Settings → Secrets and variables →
Actions → "New repository secret". Kein Secret wurde in diesem Schritt im
Repo angelegt oder hartcodiert.

### 7. Upload-Weg korrigiert: `xcrun altool` → `xcodebuild -exportArchive` (destination: upload)

Geprüft, ob `xcrun altool` mit der gewählten Xcode-Version
(`latest-stable`, aktuell Xcode 15/16-Generation) noch der richtige Weg
ist: **Nein, korrigiert.** Apple hat `altool` bereits mit den Xcode-13-
Release-Notes als deprecated markiert ("Use Xcode or Transporter to upload
builds to App Store Connect") und das Tool ist in neueren Xcode-Versionen
nicht mehr durchgängig verlässlich vorhanden. Der Workflow wurde
entsprechend umgestellt:

- **Vorher (§7k, jetzt ersetzt):** `xcrun altool --upload-app --apiKey ... --apiIssuer ...`
- **Jetzt:** `xcodebuild -exportArchive -exportOptionsPlist <plist mit
  `destination: upload`> -authenticationKeyPath ... -authenticationKeyID ...
  -authenticationKeyIssuerID ...` – das ist derselbe, von Xcode Organizer
  und dem Transporter-Tool intern verwendete Signing-/Upload-Mechanismus,
  offiziell von Apple für nicht-interaktive CI-Uploads vorgesehen, **kein**
  Drittanbieter-Tool (kein fastlane) nötig.

Der Workflow exportiert dafür zweimal aus demselben Archiv: einmal mit
`destination: export` (liefert das lokale `.ipa` für den GitHub-Actions-
Artifact-Download) und einmal mit `destination: upload` (lädt direkt zu
App Store Connect/TestFlight hoch, authentifiziert über die
`-authenticationKey*`-Flags mit dem App Store Connect API Key – kein
persönliches Apple-Passwort, kein interaktives 2FA).

### 8. Ablauf nach Eintragen aller Secrets

```
GitHub → Actions → "Build iOS TestFlight" → Run workflow
  → Preflight (Secrets + Scheme-Datei) ✅
  → Angular Build + cap sync ios
  → Zertifikat/Profil in temporäre Keychain
  → xcodebuild archive (Release, manuelles Signing)
  → Export .ipa (lokal, als Artifact herunterladbar)
  → Export mit destination "upload" → direkter Upload zu App Store Connect
  → Build erscheint in App Store Connect → TestFlight (interner Kreis)
  → auf iPhone via TestFlight-App installierbar (sobald interner Tester
    hinzugefügt wurde – App Store Connect → TestFlight → Internal Testing)
```

### 9. Was unverändert bleibt

- `build-android-apk.yml`, Android-Struktur, Backend/JWT/DB/Entitlements/
  `AppRegistry` – **nicht angefasst**.
- Keine neue Mobile-Architektur, kein `IosAuthService`, kein zusätzlicher
  Adapter – ausschließlich CI-technische Ergänzungen (eine Xcode-Scheme-XML-
  Datei, Anpassung des Upload-Kommandos im Workflow).

### 10. Verdikt

Die Pipeline ist jetzt so weit vorbereitet, dass **ausschließlich noch die
acht Secrets (Abschnitt 6) sowie die fünf einmaligen Apple-Portal-Objekte
(Abschnitt 5) fehlen** – keine weiteren Code- oder Workflow-Änderungen sind
für einen ersten echten Testlauf erforderlich. Sobald beides vorhanden ist,
sollte "Run workflow" ohne weitere Anpassung einen Build direkt in
TestFlight liefern.

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

