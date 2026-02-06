@echo off
REM Complete Database Reset Script für Windows (lokales Testen)
REM Löscht die storedb Datenbank komplett und erstellt sie neu

echo ========================================================
echo COMPLETE DATABASE RESET - FRESH START (Windows)
echo ========================================================
echo.
echo WARNUNG: Dies loescht die GESAMTE Datenbank 'storedb'!
echo          Flyway-History wird komplett zurueckgesetzt
echo.
set /p confirm="Bist du SICHER? Tippe 'DELETE-ALL' um fortzufahren: "

if not "%confirm%"=="DELETE-ALL" (
    echo Abgebrochen - keine Aenderungen vorgenommen
    exit /b 0
)

echo.
echo Starte kompletten Reset...
echo.

REM PostgreSQL Verbindungsdetails (anpassen falls noetig)
set PGHOST=localhost
set PGPORT=5432
set PGUSER=postgres
set DB_NAME=storedb
set DB_USER=storeapp

echo Beende alle Verbindungen zu '%DB_NAME%'...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '%DB_NAME%' AND pid <> pg_backend_pid();" 2>nul

echo Loesche Datenbank '%DB_NAME%'...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
if errorlevel 1 (
    echo FEHLER beim Loeschen der Datenbank
    exit /b 1
)
echo Datenbank '%DB_NAME%' geloescht

echo Erstelle Datenbank '%DB_NAME%' neu...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" 2>nul
if errorlevel 1 (
    echo FEHLER beim Erstellen der Datenbank
    exit /b 1
)
echo Datenbank '%DB_NAME%' neu erstellt

echo Setze Berechtigungen fuer '%DB_USER%'...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %DB_NAME% -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;"
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %DB_NAME% -c "GRANT ALL PRIVILEGES ON SCHEMA public TO %DB_USER%;"
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %DB_NAME% -c "ALTER SCHEMA public OWNER TO %DB_USER%;"
echo Berechtigungen gesetzt

echo.
echo ========================================================
echo Database Reset abgeschlossen!
echo ========================================================
echo.
echo Naechste Schritte:
echo   1. Starte die Spring Boot Application (mvn spring-boot:run)
echo   2. Flyway wird automatisch V1__initial_schema.sql ausfuehren
echo   3. Alle Tabellen werden neu erstellt mit korrektem Schema
echo.
echo Hinweis: baseline-on-migrate=true ist in application.yml aktiviert
echo.
pause

