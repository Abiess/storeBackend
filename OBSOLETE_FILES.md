# Veraltete Dateien nach Flyway-Migration

## ❌ Diese Dateien werden NICHT mehr benötigt:

### SQL-Scripts (ersetzt durch Flyway Migrationen)
- ❌ `scripts/init-schema.sql` → Ersetzt durch `src/main/resources/db/migration/V1__initial_schema.sql`
- ❌ `src/main/resources/init-schema.sql` → Wird nicht mehr verwendet

### Shell-Scripts (ersetzt durch Flyway + flyway-helper.sh)
- ❌ `scripts/init-schema.sh` → Flyway läuft automatisch beim App-Start
- ❌ `scripts/reset-database.sh` → Ersetzt durch `scripts/flyway-helper.sh clean`
- ❌ `scripts/grant-permissions.sh` → Nicht mehr nötig (Flyway läuft als storeapp User)
- ❌ `scripts/diagnose-database.sh` → Ersetzt durch `scripts/flyway-helper.sh status/tables/check`
- ❌ `scripts/smart-db-migration.sh` → Flyway verwaltet Migrationen automatisch
- ❌ `scripts/init-production-db.sh` → Flyway beim App-Start

### Deployment-Scripts (aktualisiert)
- ✅ `scripts/deploy.sh` → **WURDE AKTUALISIERT** - verwendet jetzt Flyway statt manuelle Scripts

## ✅ Diese Dateien sind NEU und wichtig:

### Flyway Migrationen
- ✅ `src/main/resources/db/migration/V1__initial_schema.sql` - Haupt-Schema
- ✅ `src/main/resources/db/migration/V2__initial_data.sql` - Initiale Daten

### Helper-Scripts
- ✅ `scripts/flyway-helper.sh` - Ersetzt alle alten DB-Scripts

### Deployment
- ✅ `scripts/deploy.sh` - Aktualisiert für Flyway (keine manuellen DB-Scripts mehr)

### Dokumentation
- ✅ `FLYWAY_MIGRATION_GUIDE.md` - Vollständige Anleitung
- ✅ `FLYWAY_QUICKSTART.md` - Schnellstart
- ✅ `DATABASE_SETUP.md` - Aktualisiert für Flyway

## 🗑️ Empfohlene Aktionen:

```bash
# Option 1: Archivieren (sicherer)
mkdir -p archive/old-db-scripts
mv scripts/init-schema.sql archive/old-db-scripts/ 2>/dev/null || true
mv scripts/init-schema.sh archive/old-db-scripts/ 2>/dev/null || true
mv scripts/reset-database.sh archive/old-db-scripts/ 2>/dev/null || true
mv scripts/grant-permissions.sh archive/old-db-scripts/ 2>/dev/null || true
mv scripts/diagnose-database.sh archive/old-db-scripts/ 2>/dev/null || true
mv scripts/smart-db-migration.sh archive/old-db-scripts/ 2>/dev/null || true
mv scripts/init-production-db.sh archive/old-db-scripts/ 2>/dev/null || true
mv src/main/resources/init-schema.sql archive/old-db-scripts/ 2>/dev/null || true

echo "✅ Alte Scripts archiviert in archive/old-db-scripts/"

# Option 2: Löschen (wenn du sicher bist)
rm -f scripts/init-schema.sql
rm -f scripts/init-schema.sh
rm -f scripts/reset-database.sh
rm -f scripts/grant-permissions.sh
rm -f scripts/diagnose-database.sh
rm -f scripts/smart-db-migration.sh
rm -f scripts/init-production-db.sh
rm -f src/main/resources/init-schema.sql

echo "✅ Alte Scripts gelöscht"
```

## 📋 Vergleich Alt vs. Neu

| Alt (zu löschen) | Neu (verwenden) |
|------------------|-----------------|
| `scripts/init-schema.sql` | `src/main/resources/db/migration/V1__initial_schema.sql` |
| `scripts/init-schema.sh` | Automatisch beim Start |
| `scripts/reset-database.sh` | `scripts/flyway-helper.sh clean` |
| `scripts/diagnose-database.sh` | `scripts/flyway-helper.sh status` |
| `scripts/smart-db-migration.sh` | Flyway automatisch |
| `scripts/init-production-db.sh` | Flyway automatisch |
| `scripts/grant-permissions.sh` | Nicht mehr nötig |
| Manuelle Aufrufe in `deploy.sh` | Flyway läuft beim App-Start |

## ⚠️ Hinweise

1. **Backup vorher erstellen** (falls du unsicher bist):
   ```bash
   mkdir -p backup-before-cleanup
   cp scripts/*.sh backup-before-cleanup/ 2>/dev/null || true
   cp scripts/*.sql backup-before-cleanup/ 2>/dev/null || true
   ```

2. **Production**: Die alten Scripts sind dort bereits obsolet - Flyway macht alles automatisch

3. **Git**: Wenn du die Dateien löscht, vergiss nicht zu committen:
   ```bash
   git rm scripts/init-schema.sql
   git rm scripts/init-schema.sh
   git rm scripts/reset-database.sh
   git rm scripts/grant-permissions.sh
   git rm scripts/diagnose-database.sh
   git rm scripts/smart-db-migration.sh
   git rm scripts/init-production-db.sh
   git rm src/main/resources/init-schema.sql
   
   git add scripts/deploy.sh  # Aktualisierte Version
   
   git commit -m "chore: Remove obsolete database scripts (replaced by Flyway)
   
   - Removed manual SQL initialization scripts
   - Removed database migration/reset/diagnose scripts
   - Updated deploy.sh to rely on Flyway automatic migrations
   - All database changes now managed via versioned Flyway migrations"
   ```

## ✅ Zusammenfassung

**8 Dateien können entfernt werden**, da Flyway diese Funktionalität übernimmt:
- Automatische Schema-Erstellung
- Versionierung
- Diagnose
- Berechtigungen
- Reset/Migration

**1 Datei wurde aktualisiert**:
- `scripts/deploy.sh` - Jetzt deutlich einfacher, verwendet Flyway

## 🎉 Vorteile des neuen Systems:

| Feature | Alt | Neu (Flyway) |
|---------|-----|--------------|
| **Deployment** | Manuell 3 Scripts ausführen | Automatisch beim Start |
| **Fehler-Handling** | Scripts können fehlschlagen | Flyway rollback |
| **Versionierung** | Keine | V1, V2, V3... |
| **Status-Tracking** | Unbekannt | flyway_schema_history |
| **CI/CD** | Kompliziert | Einfach |
| **Team-Arbeit** | Merge-Konflikte | Git-freundlich |
