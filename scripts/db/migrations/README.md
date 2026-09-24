# Datenbank-Migrations-Ordner

Alle SQL-Dateien hier werden **automatisch nach jedem Deployment** von [`deploy.sh`](../../deploy.sh) ausgeführt – **bevor** das Backend neu gestartet wird.

## Regeln

1. **Dateinamen:** `V<NNN>__<beschreibung>.sql` – z.B. `V001__add_user_ai_columns.sql`, `V002__add_payment_table.sql`
2. **Reihenfolge:** Nach Dateinamen alphabetisch sortiert (deshalb Nummerierung mit führenden Nullen).
3. **Idempotent:** Jede Migration MUSS mehrfach ausführbar sein (sie läuft bei jedem Deploy erneut!). Verwende:
   - `CREATE TABLE IF NOT EXISTS ...`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
   - `CREATE INDEX IF NOT EXISTS ...`
   - `DO $$ BEGIN IF NOT EXISTS (...) THEN ... END IF; END$$;` für Constraints
4. **Transaktionen:** Wickle jede Migration in `BEGIN; ... COMMIT;` ein.
5. **Production-DB:** PostgreSQL – PostgreSQL-spezifische Syntax ist erlaubt.

## Beispiel

```sql
-- V003__add_payment_methods.sql
BEGIN;

CREATE TABLE IF NOT EXISTS payment_methods (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_name ON payment_methods(name);

COMMIT;
```

## Manuelle Ausführung

```bash
# Auf dem VPS – einzelne Migration manuell ausführen
sudo -u postgres psql -d storedb -f /opt/storebackend/scripts/db/migrations/V001__add_user_ai_and_language_columns.sql
```

## Hinweis

Dies ist eine einfache "alle-bei-jedem-Deploy"-Lösung. Wenn das System wächst, sollte auf **Flyway** umgestellt werden, das die ausgeführten Migrationen in einer `flyway_schema_history`-Tabelle nachhält und jede Migration nur **einmal** ausführt.

