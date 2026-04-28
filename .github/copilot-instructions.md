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

---

### Angular-Regeln
- Standalone Components → `imports: [...]` direkt in `@Component`
- Keine `NgModule`-Dateien erstellen
- Routing via `RouterModule` oder `RouterLink` direkt im Component-Import
- HTTP via `HttpClient` (nicht `HttpClientModule` global – wird per `provideHttpClient()` bereitgestellt)

---

> Vollständige Doku mit allen Interfaces, API-Endpunkten und DB-Schema: siehe `CODEBASE_CONTEXT.md`

