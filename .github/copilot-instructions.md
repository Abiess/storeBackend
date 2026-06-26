# GitHub Copilot – Workspace Instructions
# Diese Datei wird von GitHub Copilot automatisch als Kontext geladen.
# Vollständige Dokumentation: CODEBASE_CONTEXT.md im Repo-Root.

## Projekt: markt.ma – SaaS Multi-Tenant Shop-Plattform

### Stack
- **Backend:** Spring Boot 3, Java 21, PostgreSQL, MinIO, JWT-Auth
- **Frontend:** Angular 17+ – ausschließlich **Standalone Components** (KEINE NgModules)
- **Styling:** SCSS, Design-Token: Lila-Gradient `#667eea → #764ba2`
- **i18n:** `de` / `en` / `ar` (RTL), Pipe: `{{ 'key' | translate }}`

---

### Build-Befehle (IMMER merken)
```bash
# Backend
cd storeBackend && mvn clean compile

# Frontend
cd storeFrontend && npm start   # → http://localhost:4200
```

---

### WICHTIGSTE REGEL – Immer `app-responsive-data-list` verwenden
**Niemals** eigene Tabellen, `mat-table` oder Card-Grids bauen.  
Stattdessen IMMER die zentrale Komponente nutzen:

```html
<app-responsive-data-list
  [items]="items"
  [columns]="columns"
  [actions]="actions"
  [loading]="loading"
  [rowClickable]="true"
  searchPlaceholder="Suchen..."
  emptyIcon="📦"
  emptyMessage="Keine Einträge"
  (rowClick)="onEdit($event.id)">
</app-responsive-data-list>
```

Import: `ResponsiveDataListComponent, ColumnConfig, ActionConfig` aus  
`@app/shared/components/responsive-data-list/responsive-data-list.component`

**ColumnConfig-Typen:** `text | image | badge | currency | date | number | custom`  
**Badge-Klassen:** `status-active | status-draft | status-archived | status-processing | status-shipped | status-inactive`

---

### Sidebar-Sichtbarkeit
`NavItem` und `NavGroup` haben `visible?: boolean` – `false` = ausgeblendet.

---

### StoreId im Frontend – immer 3-stufig extrahieren
```typescript
let id = route.snapshot.paramMap.get('storeId') || route.snapshot.paramMap.get('id');
if (!id && route.parent) id = route.parent.snapshot.paramMap.get('id');
if (!id) { const m = router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }
```

---

### Backend-API
- Basis: `https://api.markt.ma` / lokal: `http://localhost:8080`
- Store-Routen: `/api/stores/{storeId}/...`
- Public (kein Auth): `/api/public/stores/{storeId}/...`
- Auth-Header: `Authorization: Bearer <JWT>`

---

### DB-Besonderheiten
- Flyway **deaktiviert** → `ddl-auto: update` → neue Felder immer in `@Entity` ergänzen
- `media`-Tabelle: Spalte heißt `filename` in DB, `file_name` in JPA-Entity
- Neue User-Felder: `phone_number VARCHAR(20) UNIQUE NULLABLE` (Phone-Auth)

---

### Angular-Regeln
- Standalone Components → `imports: [...]` direkt in `@Component`
- Keine `NgModule`-Dateien erstellen
- Routing via `RouterModule` oder `RouterLink` direkt im Component-Import
- HTTP via `HttpClient` (nicht `HttpClientModule` global – wird per `provideHttpClient()` bereitgestellt)

---

### i18n JSON – PFLICHT nach jeder Änderung validieren
```powershell
Get-Content src/assets/i18n/de.json -Raw | ConvertFrom-Json | Out-Null
# Kein Fehler = gültiges JSON ✅
```
**Häufiger Bug:** Replace-Operationen hinterlassen doppelte Abschluss-Blöcke → `SyntaxError` im Browser.

---

### Phone-Auth (WhatsApp/Telegram – kein E-Mail-Login nötig)
Route `/quick-start` → `QuickStartComponent` (KEIN authGuard)  
Service: `PhoneQuickAuthService` (`core/services/phone-quick-auth.service.ts`)  
Backend: `POST /api/auth/phone/request-code` + `POST /api/auth/phone/verify-and-login` (public)  
**DEV:** `whatsapp.enabled=false` → Code erscheint im Backend-Log (`[DEV] Verification code for ...`)

---

### Microsoft Clarity Analytics
**Integration:** `ClarityService` (`core/services/clarity.service.ts`)  
**Aktivierung:** `environment.prod.ts` → `clarityId: 'abc123xyz'` (leer = deaktiviert)  
**Events:** Login, Store-Erstellung, Phone-Auth-Flow (siehe Custom Events im Clarity Dashboard)

**Anonymisierung / Cookie Masking:**
- `environment.prod.ts` → `clarityMaskData: false` (DEFAULT = **OHNE Maskierung**, volle Daten)
- `clarityMaskData: true` → IP-Adressen und sensible Daten werden maskiert (DSGVO-konform)
- Änderung erfordert **Frontend-Rebuild + Deploy**

**Hinweis:** Clarity ist NUR in Production aktiv (nie auf localhost)

---
Backend: `POST /api/auth/phone/request-code` + `POST /api/auth/phone/verify-and-login` (public)  
**DEV:** `whatsapp.enabled=false` → Code erscheint im Backend-Log (`[DEV] Verification code for ...`)

---

### Security – neue public Endpoints registrieren
```java
// SecurityConfig.java – neue public Routes IMMER hier eintragen:
.requestMatchers("/api/auth/phone/**").permitAll()
.requestMatchers("/api/auth/login", "/api/auth/register", ...).permitAll()
```---

> Vollständige Doku mit allen Interfaces, API-Endpunkten und DB-Schema: siehe `CODEBASE_CONTEXT.md`
