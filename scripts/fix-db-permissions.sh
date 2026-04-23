#!/usr/bin/env bash
# ========================================================================
# fix-db-permissions.sh
# ------------------------------------------------------------------------
# Behebt: ERROR: must be owner of table xxx
#
# Ursache: Tabellen wurden von 'postgres' erstellt (z.B. via Backup-Restore,
# manuelle CREATE-Statements oder einer früheren Hibernate-Session unter
# anderem User). Wenn die App jetzt als 'storeapp' läuft, schlagen
# DDL-Statements (CREATE INDEX, ALTER TABLE, …) mit Owner-Fehler fehl.
#
# Lösung: grant-permissions.sql führt ALTER TABLE … OWNER TO storeapp für
# ALLE Tabellen + Sequences im public-Schema aus. Idempotent → kann beliebig
# oft ausgeführt werden.
#
# Verwendung:
#   sudo bash scripts/fix-db-permissions.sh
# ========================================================================

set -euo pipefail

DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/grant-permissions.sql"

echo "================================================================"
echo "🔧 Setze Datenbank-Permissions für '$DB_USER' auf DB '$DB_NAME'"
echo "================================================================"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ FEHLER: $SQL_FILE nicht gefunden!"
    exit 1
fi

# Prüfe, ob psql verfügbar
if ! command -v psql > /dev/null 2>&1; then
    echo "❌ FEHLER: 'psql' Kommando nicht gefunden. Bitte postgresql-client installieren."
    exit 1
fi

# Prüfe, ob DB existiert
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
    echo "⚠️  Datenbank '$DB_NAME' existiert nicht — überspringe Permissions-Setup."
    exit 0
fi

# Prüfe, ob User existiert (wenn nicht: anlegen wir hier nicht — nur warnen)
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1; then
    echo "❌ FEHLER: User '$DB_USER' existiert nicht. Lege ihn zuerst an."
    echo "   Beispiel: sudo -u postgres createuser --pwprompt $DB_USER"
    exit 1
fi

echo "▶ Führe grant-permissions.sql aus (als postgres-Superuser)..."
if sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SQL_FILE"; then
    echo "✅ Permissions erfolgreich gesetzt."
    echo "   Alle Tabellen + Sequences im Schema 'public' gehören jetzt $DB_USER."
else
    echo "❌ Permissions-Setup fehlgeschlagen!"
    exit 1
fi

