@echo off
REM ============================================
REM Modern Layout Migration Script (Windows)
REM ============================================

echo.
echo 🎨 Modern Store Frontend - Migration Script
echo ===========================================
echo.

REM Pfad zum Storefront-Verzeichnis
set STOREFRONT_DIR=src\app\features\storefront

cd %STOREFRONT_DIR%

REM Backup erstellen
echo 📦 Erstelle Backup der alten Dateien...
if exist storefront.component.html (
    copy storefront.component.html storefront.component.html.backup >nul
    echo ✅ HTML backup erstellt: storefront.component.html.backup
)

if exist storefront.component.scss (
    copy storefront.component.scss storefront.component.scss.backup >nul
    echo ✅ SCSS backup erstellt: storefront.component.scss.backup
)

REM Neue Dateien aktivieren
echo.
echo 🔄 Aktiviere neue moderne Layout-Dateien...

if exist storefront-modern.component.html (
    move /Y storefront-modern.component.html storefront.component.html >nul
    echo ✅ Neues HTML-Template aktiviert
)

if exist storefront-modern.component.scss (
    move /Y storefront-modern.component.scss storefront.component.scss >nul
    echo ✅ Neue SCSS-Styles aktiviert
)

REM Prüfe ob Components existieren
echo.
echo 🔍 Prüfe Layout-Komponenten...

set ALL_EXIST=1

if exist components\store-layout.component.ts (
    echo ✅ components\store-layout.component.ts
) else (
    echo ❌ components\store-layout.component.ts FEHLT!
    set ALL_EXIST=0
)

if exist components\store-sidebar.component.ts (
    echo ✅ components\store-sidebar.component.ts
) else (
    echo ❌ components\store-sidebar.component.ts FEHLT!
    set ALL_EXIST=0
)

if exist components\product-grid.component.ts (
    echo ✅ components\product-grid.component.ts
) else (
    echo ❌ components\product-grid.component.ts FEHLT!
    set ALL_EXIST=0
)

if exist components\modern-product-card.component.ts (
    echo ✅ components\modern-product-card.component.ts
) else (
    echo ❌ components\modern-product-card.component.ts FEHLT!
    set ALL_EXIST=0
)

if exist components\modern-store-header.component.ts (
    echo ✅ components\modern-store-header.component.ts
) else (
    echo ❌ components\modern-store-header.component.ts FEHLT!
    set ALL_EXIST=0
)

if %ALL_EXIST%==0 (
    echo.
    echo ⚠️  Einige Komponenten fehlen! Bitte erstelle diese zuerst.
    pause
    exit /b 1
)

echo.
echo ✅ Migration abgeschlossen!
echo.
echo 📝 Nächste Schritte:
echo 1. Öffne storefront.component.ts
echo 2. Füge folgende Methoden hinzu (falls nicht vorhanden):
echo.
echo    searchQuery = '';
echo.
echo    onSearchChange(query: string): void {
echo      this.searchQuery = query.toLowerCase();
echo    }
echo.
echo    get displayedProducts(): Product[] {
echo      let products = this.filteredProducts;
echo      if (this.searchQuery) {
echo        products = products.filter(p ^^^=^^^> {
echo          return p.name?.toLowerCase().includes(this.searchQuery) ^^^|^^^|
echo                 p.description?.toLowerCase().includes(this.searchQuery);
echo        });
echo      }
echo      return products;
echo    }
echo.
echo 3. Teste die Anwendung:
echo    npm start
echo.
echo 💡 Zum Rückgängig machen:
echo    move /Y storefront.component.html.backup storefront.component.html
echo    move /Y storefront.component.scss.backup storefront.component.scss
echo.

pause
