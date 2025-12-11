#!/bin/bash
# Smart Database Migration Script
# Automatisch ausgeführt beim Deployment - erkennt ob fresh install oder update

set -e

DB_NAME="storedb"
DB_USER="storeapp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "🔍 Smart Database Migration"
echo "========================================"

# Funktion: Prüfe ob Tabelle existiert
table_exists() {
    local table_name=$1
    sudo -u postgres psql -d $DB_NAME -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table_name');"
}

# Funktion: Prüfe ob Datenbank Daten enthält
has_data() {
    local user_count=$(sudo -u postgres psql -d $DB_NAME -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    echo "$user_count"
}

# Prüfe ob users Tabelle existiert
if [ "$(table_exists 'users')" = "t" ]; then
    USER_COUNT=$(has_data)
    echo "✅ Datenbank existiert bereits"
    echo "📊 Anzahl Benutzer: $USER_COUNT"

    if [ "$USER_COUNT" -gt 0 ]; then
        echo ""
        echo "⚠️  WARNUNG: Datenbank enthält $USER_COUNT Benutzer"
        echo ""
        echo "Wähle eine Option:"
        echo "  1) 🔄 Migration (nur fehlende Tabellen hinzufügen - EMPFOHLEN)"
        echo "  2) 🗑️  Fresh Install (ALLES LÖSCHEN und neu erstellen)"
        echo "  3) ⏭️  Überspringen (nichts ändern)"
        echo ""

        # Im automatischen Deployment: Standardmäßig Migration
        if [ "${AUTO_DEPLOY}" = "true" ]; then
            echo "🤖 Auto-Deploy Modus: Wähle automatisch Option 1 (Migration)"
            CHOICE=1
        else
            read -p "Deine Wahl [1-3]: " CHOICE
        fi

        case $CHOICE in
            1)
                echo "🔄 Führe Migration durch..."
                sudo -u postgres psql -d $DB_NAME -f "$SCRIPT_DIR/migrate-database.sql"
                echo "✅ Migration abgeschlossen"
                ;;
            2)
                echo "🗑️  WARNUNG: Lösche ALLE Daten!"
                read -p "Bist du SICHER? Tippe 'JA LÖSCHEN' um fortzufahren: " CONFIRM
                if [ "$CONFIRM" = "JA LÖSCHEN" ]; then
                    sudo -u postgres psql -d $DB_NAME -f "$SCRIPT_DIR/init-schema.sql"
                    echo "✅ Fresh Install abgeschlossen"
                else
                    echo "❌ Abgebrochen"
                    exit 1
                fi
                ;;
            3)
                echo "⏭️  Überspringe Datenbankänderungen"
                exit 0
                ;;
            *)
                echo "❌ Ungültige Auswahl"
                exit 1
                ;;
        esac
    else
        echo "📭 Datenbank ist leer - führe Initial-Setup durch"
        sudo -u postgres psql -d $DB_NAME -f "$SCRIPT_DIR/init-schema.sql"
        echo "✅ Initial-Setup abgeschlossen"
    fi
else
    echo "🆕 Erste Installation - erstelle Schema"
    sudo -u postgres psql -d $DB_NAME -f "$SCRIPT_DIR/init-schema.sql"
    echo "✅ Schema erstellt"
fi

echo ""
echo "========================================"
echo "✅ Datenbank-Migration abgeschlossen"
echo "========================================"

