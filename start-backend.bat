@echo off
REM Einfaches Start-Script fuer lokale Entwicklung (Windows)
REM Verwendet Maven direkt (nicht den Wrapper)

echo ========================================
echo   Store Backend - Lokaler Start
echo ========================================
echo.

REM Pruefe ob Maven installiert ist
where mvn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Maven ist nicht installiert oder nicht im PATH
    echo Bitte installieren Sie Maven: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

REM Zeige Maven Version
echo [INFO] Maven Version:
mvn --version
echo.

REM Starte das Backend
echo [INFO] Starte Backend auf http://localhost:8081
echo [INFO] MinIO ist DEAKTIVIERT (nur lokale Entwicklung)
echo [INFO] H2 Datenbank im Speicher
echo.
echo [TIPP] Druecken Sie Strg+C um das Backend zu stoppen
echo.
echo ========================================
echo.

mvn spring-boot:run

pause

