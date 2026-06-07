# Codebase Context – markt.ma SaaS Shop-Plattform

## Stack
- **Backend:** Spring Boot 3, Java 21, PostgreSQL, MinIO, JWT
- **Frontend:** Angular 17+ (Standalone Components, keine NgModules), SCSS
- **Deployment:** VPS, Nginx, systemd (`storebackend.service`), Flyway deaktiviert (`ddl-auto: update`)

---

## Frontend-Struktur
```
storeFrontend/src/app/
├── core/
│   ├── services/          # API-Services (ProductService, StoreService, CouponService, ...)
│   ├── models/            # Interfaces & DTOs (index.ts als Barrel)
│   ├── pipes/             # TranslatePipe
│   └── guards/            # Auth-Guards
├── features/
│   ├── products/          # product-list, product-form, category-list, product-detail
│   ├── stores/            # store-orders, store-theme, order-detail
│   ├── coupons/           # coupons-list, coupon-editor
│   ├── storefront/        # Öffentliche Shop-Seite (cart, checkout, product-grid)
│   ├── settings/          # user-roles, redirects-page (SEO)
│   └── orders/            # fulfillment-tracker, order-detail-admin
└── shared/
    ├── components/
    │   ├── responsive-data-list/   ← ZENTRALE LISTEN-KOMPONENTE (siehe unten)
    │   ├── admin-sidebar/          ← Sidebar mit visible-Flag
    │   ├── page-header.component   ← Einheitlicher Seitenkopf
    │   ├── store-navigation        ← Breadcrumb-Navigation
    │   └── preview-panel           ← Sliding Live-Preview (FAB)
    └── pipes/
```

---

## Zentrale Komponente: `app-responsive-data-list`

**Pfad:** `src/app/shared/components/responsive-data-list/responsive-data-list.component.ts`

**Zweck:** Einheitliche Tabellen-/Listenansicht für ALLE Admin-Seiten. Ersetzt alle individuellen Tabellen und Card-Grids.

**Inputs:**
| Input | Typ | Beschreibung |
|---|---|---|
| `[items]` | `any[]` | Datenarray |
| `[columns]` | `ColumnConfig[]` | Spalten-Konfiguration |
| `[actions]` | `ActionConfig[]` | Aktions-Buttons pro Zeile |
| `[loading]` | `boolean` | Zeigt Shimmer-Skeleton |
| `[rowClickable]` | `boolean` | Zeile klickbar mit Chevron `›` |
| `[searchable]` | `boolean` | Suchfeld anzeigen |
| `[searchPlaceholder]` | `string` | Placeholder im Suchfeld |
| `[emptyMessage]` | `string` | Text bei leerer Liste |
| `[emptyIcon]` | `string` | Emoji für Empty-State |
| `[showToolbar]` | `boolean` | Toolbar (Suche + Toggle) anzeigen |
| `[defaultView]` | `'table'\|'cards'` | Start-Ansicht |

**Outputs:**
| Output | Beschreibung |
|---|---|
| `(rowClick)` | Gibt das geklickte Item zurück |
| `(searchChange)` | Gibt den Suchbegriff zurück |

**ColumnConfig:**
```typescript
interface ColumnConfig {
  key: string;           // Property-Pfad (auch verschachtelt: 'category.name')
  label: string;         // Spalten-Überschrift
  type?: 'text' | 'image' | 'badge' | 'currency' | 'date' | 'number' | 'custom';
  width?: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  mobileLabel?: string;
  formatFn?: (value, item) => string;     // Optional: Wert formatieren
  badgeClass?: (value, item) => string;   // CSS-Klasse für Badge
}
```

**ActionConfig:**
```typescript
interface ActionConfig {
  icon: string;
  label: string;
  class?: string;                    // 'danger' für roten Hover
  handler: (item) => void;
  visible?: (item) => boolean;       // Optional: konditionale Sichtbarkeit
}
```

**Badge-CSS-Klassen (vordefiniert):**
- `status-active` / `status-delivered` → grün
- `status-draft` / `status-pending` → gelb
- `status-archived` / `status-cancelled` → rot
- `status-processing` / `status-confirmed` → blau
- `status-shipped` → dunkelgrün
- `status-inactive` → grau

**Verwendung (Minimalbeispiel):**
```html
<app-responsive-data-list
  [items]="products"
  [columns]="columns"
  [actions]="actions"
  [loading]="loading"
  [rowClickable]="true"
  searchPlaceholder="Suchen..."
  emptyIcon="📦"
  emptyMessage="Keine Produkte"
  (rowClick)="onEdit($event.id)">
</app-responsive-data-list>
```

**Bereits umgestellt:**
- ✅ `product-list.component.ts`
- ✅ `coupons-list.component.ts`
- ✅ `category-list.component.ts`
- ✅ `redirects-page.component.ts`
- ✅ `store-orders.component.ts`

---

## Admin-Sidebar: `app-admin-sidebar`

**Pfad:** `src/app/shared/components/admin-sidebar/admin-sidebar.component.ts`

**Interfaces:**
```typescript
interface NavItem {
  labelKey: string;   // i18n-Key
  icon: string;       // Emoji
  route?: string;
  badge?: string;
  badgeClass?: string;
  visible?: boolean;  // false = ausgeblendet (Standard: true)
}

interface NavGroup {
  titleKey?: string;
  items: NavItem[];
  visible?: boolean;  // false = gesamte Gruppe ausgeblendet
}
```

**Sichtbarkeit steuern:**
```typescript
// Item ausblenden:
{ labelKey: '...', icon: '...', route: '...', visible: false }

// Gruppe ausblenden:
{ titleKey: '...', visible: false, items: [...] }

// Dynamisch:
{ ..., visible: this.authService.hasRole('ADMIN') }
```

---

## Design-System

**Primärfarben:** `#667eea → #764ba2` (Lila-Gradient)
**Font:** Inter, System-UI
**Border-Radius:** 8px (Buttons), 12px (Cards/Panels), 14px (große Cards)
**Schatten:** `0 2px 8px rgba(0,0,0,0.06)` (Standard), `0 8px 24px rgba(0,0,0,0.10)` (Hover)
**Einheitlicher Button:**
```css
background: linear-gradient(135deg, #667eea, #764ba2);
color: white; border: none; border-radius: 8px;
padding: .75rem 1.5rem; font-weight: 600; cursor: pointer;
```

---

## i18n

- Sprachen: `de`, `en`, `ar` (RTL für Arabisch)
- JSON-Dateien: `src/assets/i18n/de.json`, `en.json`, `ar.json`
- Pipe: `{{ 'key' | translate }}`
- Service: `TranslationService.translate('key')`
- User-Sprache: `users.preferred_language` (DB-Spalte, Default: `'en'`)

---

## Backend API-Basis

- **Basis-URL:** `https://api.markt.ma` (Production) / `http://localhost:8080` (Lokal)
- **Auth:** `Authorization: Bearer <JWT>` Header
- **Store-Endpunkte:** `/api/stores/{storeId}/...`
- **Public-Endpunkte:** `/api/public/stores/{storeId}/...` (kein Auth)

**Wichtige Endpunkte:**
```
GET    /api/stores/{id}/products
POST   /api/stores/{id}/products
GET    /api/stores/{id}/categories
GET    /api/stores/{id}/orders
GET    /api/stores/{id}/coupons
POST   /api/stores/{id}/media/upload       ← MinIO Upload
GET    /api/stores/{id}/theme
POST   /api/stores/{id}/theme
```

---

## DB-Schema (Wichtigste Tabellen)

```sql
users            (id, email, name, preferred_language, roles)
stores           (id, user_id, name, slug, plan_id, logo_url)
products         (id, store_id, title, base_price, status, category_id)
product_variants (id, product_id, sku, price, stock_quantity)
media            (id, store_id, filename, file_name, original_filename, minio_object_name, media_type)
orders           (id, store_id, customer_id, status, total_amount)
order_items      (id, order_id, product_id, quantity, unit_price)
coupons          (id, store_id, code, type, status, percent_discount, value_cents)
categories       (id, store_id, name, slug, parent_id, product_count)
store_themes     (id, store_id, name, type, template, colors_json, is_active)
seo_settings     (id, store_id, meta_title, meta_description)
```

---

## Bekannte Fixes / Besonderheiten

- **`media.filename` NOT NULL Fehler:** Das `filename`-Feld (`file_name` in Hibernate-Entity) muss beim Upload gesetzt werden – Schema-Mismatch zwischen `filename` (DB) und `file_name` (JPA).
- **StoreId-Extraktion im Frontend:** Immer 3-stufig: `route.params` → `route.parent.params` → URL-Regex `/\/stores\/(\d+)/`
- **Flyway deaktiviert:** Schemaänderungen via `ddl-auto: update` – neue Spalten müssen in der `@Entity` ergänzt werden.
- **Toast-Komponente:** `toast-success`-CSS in `store-theme.component.ts` – `slideInRight` Animation oben rechts.
- **i18n JSON-Validierung:** Nach jeder Änderung an `de.json`, `en.json`, `ar.json` mit `ConvertFrom-Json` prüfen. Häufiger Fehler: doppelter Abschluss-Block durch Replace-Operationen.
- **H2 AUTO_SERVER:** Lokaler Start mit `mvn clean compile`. Bei `Permission denied: getsockopt` ist Windows Firewall das Problem – ggf. `AUTO_SERVER=TRUE` aus der JDBC-URL entfernen.

---

## Phone-Auth Flow (WhatsApp/Telegram Schnellstart) – 2026-06-07

### Ziel
Marokkanische Nutzer können ohne E-Mail-Registrierung direkt einen Store starten.

### Frontend-Route
```
/quick-start   → QuickStartComponent   (KEIN authGuard)
```
**Datei:** `src/app/features/auth/quick-start.component.ts`

**3-Schritt-Wizard:**
1. Telefonnummer + Kanal (WhatsApp / Telegram) eingeben
2. 6-stelligen Code eingeben (60s Countdown, Resend)
3. Store-Name + URL + Kategorie → Store wird direkt erstellt

### Frontend-Service
**Datei:** `src/app/core/services/phone-quick-auth.service.ts`
```typescript
phoneAuthService.requestCode(phone, 'whatsapp')   // Step 1
phoneAuthService.verifyAndLogin(verificationId, code)  // Step 2 → JWT gespeichert
```

### Backend-Endpoints (öffentlich, kein JWT)
```
POST /api/auth/phone/request-code
  Body: { phoneNumber: "+212600123456", channel: "whatsapp" }
  Response: { success, verificationId, channel, message, expiresInMinutes }

POST /api/auth/phone/verify-and-login
  Body: { verificationId: 123, code: "456789" }
  Response: AuthResponse { token, user }   ← gleich wie normaler Login
```
**Controller:** `storebackend/controller/PhoneAuthController.java`

### User-Erstellung (Backend)
- Neuer User: `email = phone-{sanitizedNumber}@markt.ma`, `phone_number` gesetzt
- Passwort = zufälliger UUID-Hash (kein Passwort-Login möglich)
- Plan: FREE, `emailVerified = true`, `preferredLanguage = "ar"`
- Wiederkehrender User: wird via `UserRepository.findByPhoneNumber()` gefunden

### DB-Schema-Änderung
```sql
-- users-Tabelle (neue Spalte, nullable):
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) UNIQUE;
-- wird automatisch via ddl-auto: update angelegt
```

### DEV-Modus (WhatsApp deaktiviert)
In `application.properties`: `whatsapp.enabled=false`  
→ Code erscheint im **Backend-Log**: suche nach `[DEV] Verification code for +212...`

### Security (SecurityConfig.java)
```java
.requestMatchers("/api/auth/phone/**").permitAll()  // öffentlich, kein JWT
```

### Landing Page CTAs (neu)
- Hero: Grüner Banner „Ohne E-Mail starten – nur WhatsApp oder Telegram"
- CTA-Sektion: Zusätzlicher Button „📱 Ohne E-Mail – nur WhatsApp"
- Mobile Nav: Neuer Tab „📱 WhatsApp-Start" → `/quick-start`
- Methode in `LandingComponent`: `navigateToQuickStart()`

---

## Build-Befehle (lokal)

```bash
# Backend kompilieren
cd storeBackend && mvn clean compile

# Frontend starten
cd storeFrontend && npm start   # → http://localhost:4200
```
