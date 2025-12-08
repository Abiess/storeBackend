# Database Diagnostics Script
# Prüft ob Tabellen existieren und wo sie sind

Write-Host "=== PostgreSQL Database Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Datenbank-Verbindungsdaten
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "storedb"
$DB_USER = "storeapp"

Write-Host "Connecting to: $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER" -ForegroundColor Yellow
Write-Host ""

# SQL Queries
$queries = @(
    @{
        Name = "1. Alle Schemas anzeigen"
        Query = "SELECT nspname FROM pg_catalog.pg_namespace ORDER BY nspname;"
    },
    @{
        Name = "2. Alle Tabellen in allen Schemas"
        Query = "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;"
    },
    @{
        Name = "3. Suche nach 'domains' Tabelle"
        Query = "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%domain%';"
    },
    @{
        Name = "4. Suche nach 'users' Tabelle"
        Query = "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%user%';"
    },
    @{
        Name = "5. Suche nach 'stores' Tabelle"
        Query = "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%store%';"
    },
    @{
        Name = "6. Suche nach 'plans' Tabelle"
        Query = "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%plan%';"
    },
    @{
        Name = "7. Aktuelles Default Schema"
        Query = "SHOW search_path;"
    }
)

# Führe jede Query aus
foreach ($q in $queries) {
    Write-Host "--- $($q.Name) ---" -ForegroundColor Green

    $env:PGPASSWORD = Read-Host "Passwort für $DB_USER (wird nicht angezeigt)" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
    $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

    try {
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $q.Query
    } catch {
        Write-Host "Fehler: $_" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "=== Diagnose abgeschlossen ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Wenn keine Tabellen gefunden wurden:" -ForegroundColor Yellow
Write-Host "  1. App läuft nicht richtig / Entity-Scan Problem" -ForegroundColor Yellow
Write-Host "  2. Hibernate erstellt Tabellen in falschem Schema" -ForegroundColor Yellow
Write-Host "  3. ddl-auto=create wird nicht ausgeführt" -ForegroundColor Yellow

