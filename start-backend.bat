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
call mvn --version
echo.

REM Starte das Backend mit optimierten JVM-Parametern
echo [INFO] Starte Backend auf http://localhost:8080
echo [INFO] MinIO ist DEAKTIVIERT (nur lokale Entwicklung)
echo [INFO] H2 Datenbank im Speicher
echo [INFO] Optimiert fuer schnellen Start
echo.
echo [TIPP] Druecken Sie Strg+C um das Backend zu stoppen
echo.
echo ========================================
echo.

call mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xms256m -Xmx512m -XX:TieredStopAtLevel=1 -noverify"

pause
