# FFmpeg Installation für Windows

## Option 1: Automatische Installation (Empfohlen)

```bash
# Als Administrator ausführen
install-ffmpeg.bat
```

Das Script:
1. Lädt ffmpeg herunter (~100MB)
2. Entpackt nach C:\ffmpeg
3. Fügt automatisch zu PATH hinzu
4. **Nach Installation: NEUES Terminal öffnen!**

## Option 2: Manuelle Installation

### Schritt 1: Download
Gehe zu: https://www.gyan.dev/ffmpeg/builds/

Lade herunter: **ffmpeg-release-essentials.zip** (~100MB)

### Schritt 2: Entpacken
Entpacke nach: `C:\ffmpeg`

Struktur sollte sein:
```
C:\ffmpeg\
  ├── bin\
  │   ├── ffmpeg.exe
  │   ├── ffplay.exe
  │   └── ffprobe.exe
  └── ...
```

### Schritt 3: PATH setzen

1. **Windows-Suche**: "Umgebungsvariablen"
2. Klicke auf **"Umgebungsvariablen bearbeiten"**
3. Unter **"Systemvariablen"** → **"Path"** → **"Bearbeiten"**
4. Klicke **"Neu"** und füge hinzu:
   ```
   C:\ffmpeg\bin
   ```
5. **OK** → **OK** → **OK**
6. **Neues Terminal öffnen!**

### Schritt 4: Testen

```bash
# Öffne ein NEUES Terminal
ffmpeg -version
```

Du solltest sehen:
```
ffmpeg version 6.x.x
```

## Option 3: Mit Chocolatey (falls installiert)

```bash
choco install ffmpeg
```

## Troubleshooting

### "ffmpeg: command not found"
- **Lösung**: Schließe das Terminal und öffne ein NEUES
- PATH-Änderungen werden nur in neuen Terminals aktiv

### "Cannot find ffmpeg" bei npm run process
- **Lösung**: 
  ```bash
  # Prüfe Installation
  where ffmpeg
  
  # Sollte zeigen: C:\ffmpeg\bin\ffmpeg.exe
  ```

### Permission Denied beim PATH setzen
- **Lösung**: Script **als Administrator** ausführen
  - Rechtsklick auf `install-ffmpeg.bat`
  - "Als Administrator ausführen"

## Nach der Installation

```bash
# Öffne ein NEUES Terminal in video-automation/
cd C:\Users\t13016a\Downloads\Team2\storeBackend\video-automation

# Teste ffmpeg
ffmpeg -version

# Dann verarbeite dein Video
npm run process login
```

## Alternative: Portable Version (ohne Installation)

1. Lade ffmpeg herunter
2. Entpacke irgendwo (z.B. `Desktop\ffmpeg`)
3. Kopiere `ffmpeg.exe` direkt nach:
   ```
   C:\Users\t13016a\Downloads\Team2\storeBackend\video-automation\bin\ffmpeg.exe
   ```
4. Passe `scripts/process-video.js` an:
   ```javascript
   // Zeile 1 hinzufügen:
   process.env.PATH = path.join(__dirname, '../bin') + ';' + process.env.PATH;
   ```
@echo off
echo ========================================
echo   FFmpeg Installation für Video-Automation
echo ========================================
echo.

REM Check if ffmpeg is already installed
where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] FFmpeg ist bereits installiert!
    ffmpeg -version | findstr "ffmpeg version"
    echo.
    pause
    exit /b 0
)

echo [INFO] FFmpeg wird heruntergeladen...
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\ffmpeg-install
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Download ffmpeg (Windows build)
echo [1/4] Lade FFmpeg herunter (ca. 100MB)...
powershell -Command "& {Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile '%TEMP_DIR%\ffmpeg.zip'}"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Download fehlgeschlagen!
    echo.
    echo Bitte lade FFmpeg manuell herunter:
    echo 1. Gehe zu: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Lade "ffmpeg-release-essentials.zip" herunter
    echo 3. Entpacke es nach C:\ffmpeg
    echo 4. Fuege C:\ffmpeg\bin zu PATH hinzu
    echo.
    pause
    exit /b 1
)

echo [2/4] Entpacke FFmpeg...
powershell -Command "& {Expand-Archive -Path '%TEMP_DIR%\ffmpeg.zip' -DestinationPath '%TEMP_DIR%' -Force}"

REM Find the extracted folder (it has version number in name)
for /d %%i in ("%TEMP_DIR%\ffmpeg-*") do set FFMPEG_FOLDER=%%i

echo [3/4] Installiere FFmpeg nach C:\ffmpeg...
if exist "C:\ffmpeg" (
    echo [INFO] Altes FFmpeg gefunden, wird ersetzt...
    rmdir /s /q "C:\ffmpeg"
)
xcopy /E /I /Y "%FFMPEG_FOLDER%" "C:\ffmpeg"

echo [4/4] Fuege FFmpeg zu PATH hinzu...
setx PATH "%PATH%;C:\ffmpeg\bin" /M >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNUNG] Konnte PATH nicht automatisch setzen (Admin-Rechte erforderlich)
    echo.
    echo Bitte fuege manuell hinzu:
    echo   C:\ffmpeg\bin
    echo.
    echo zu deiner PATH Umgebungsvariable.
    echo.
) else (
    echo [OK] PATH wurde aktualisiert!
)

REM Cleanup
echo.
echo [CLEANUP] Raeume temporaere Dateien auf...
rmdir /s /q "%TEMP_DIR%"

echo.
echo ========================================
echo   Installation abgeschlossen!
echo ========================================
echo.
echo FFmpeg wurde installiert nach: C:\ffmpeg\bin\ffmpeg.exe
echo.
echo WICHTIG: Schliesse dieses Terminal und oeffne ein NEUES Terminal,
echo          damit die PATH-Aenderungen wirksam werden.
echo.
echo Dann teste mit: ffmpeg -version
echo.
pause

