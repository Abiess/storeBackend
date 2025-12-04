#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "PostgreSQL Database Initialization Script"
echo "=========================================="
echo ""
echo "⚠️  WARNUNG: Dieses Skript löscht die Datenbank und erstellt sie neu!"
echo "⚠️  Verwenden Sie dies nur für die Erstinitialisierung!"
echo ""

# Datenbank-Konfiguration
DB_NAME="storedb"
DB_USER="storeapp"
DB_PASSWORD="${DB_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Fehler: DB_PASSWORD Umgebungsvariable ist nicht gesetzt!"
  echo "Beispiel: export DB_PASSWORD='ihr-passwort' && ./init-production-db.sh"
  exit 1
fi

echo "🔍 Überprüfe PostgreSQL-Status..."
if ! sudo systemctl is-active --quiet postgresql; then
  echo "❌ PostgreSQL ist nicht aktiv!"
  echo "Starte PostgreSQL..."
  sudo systemctl start postgresql
  sleep 2
fi

echo "✅ PostgreSQL läuft"
echo ""

echo "🗄️  Erstelle/Setze Datenbank zurück..."
sudo -u postgres psql <<EOF
-- Beende alle Verbindungen zur Datenbank
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();

-- Lösche Datenbank falls vorhanden
DROP DATABASE IF EXISTS $DB_NAME;

-- Erstelle neue Datenbank
CREATE DATABASE $DB_NAME;

-- Erstelle User falls nicht vorhanden
DO
\$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

-- Gib dem User alle Rechte auf die Datenbank
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Verbinde zur neuen Datenbank und setze Schema-Rechte
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

EOF

if [ $? -eq 0 ]; then
  echo "✅ Datenbank erfolgreich initialisiert"
  echo ""
  echo "📋 Datenbank-Details:"
  echo "   Name: $DB_NAME"
  echo "   User: $DB_USER"
  echo "   Host: localhost"
  echo "   Port: 5432"
  echo ""
  echo "✅ Die Datenbank ist bereit für das erste Deployment!"
  echo ""
  echo "Nächste Schritte:"
  echo "1. Pushen Sie den Code mit ddl-auto: update"
  echo "2. Beim ersten Start werden die Tabellen automatisch erstellt"
  echo "3. DataInitializer füllt die Basisdaten (Pläne)"
  echo ""
else
  echo "❌ Fehler beim Initialisieren der Datenbank"
  exit 1
fi

