#!/bin/bash

# ============================================
# Modern Layout Migration Script
# ============================================
# Aktiviert das neue moderne Layout

set -e

echo "🎨 Modern Store Frontend - Migration Script"
echo "==========================================="
echo ""

# Pfad zum Storefront-Verzeichnis
STOREFRONT_DIR="src/app/features/storefront"

cd "$STOREFRONT_DIR"

# Backup erstellen
echo "📦 Erstelle Backup der alten Dateien..."
if [ -f "storefront.component.html" ]; then
    cp storefront.component.html storefront.component.html.backup
    echo "✅ HTML backup erstellt: storefront.component.html.backup"
fi

if [ -f "storefront.component.scss" ]; then
    cp storefront.component.scss storefront.component.scss.backup
    echo "✅ SCSS backup erstellt: storefront.component.scss.backup"
fi

# Neue Dateien aktivieren
echo ""
echo "🔄 Aktiviere neue moderne Layout-Dateien..."

if [ -f "storefront-modern.component.html" ]; then
    mv storefront-modern.component.html storefront.component.html
    echo "✅ Neues HTML-Template aktiviert"
fi

if [ -f "storefront-modern.component.scss" ]; then
    mv storefront-modern.component.scss storefront.component.scss
    echo "✅ Neue SCSS-Styles aktiviert"
fi

# Prüfe ob Components existieren
echo ""
echo "🔍 Prüfe Layout-Komponenten..."

COMPONENTS=(
    "components/store-layout.component.ts"
    "components/store-sidebar.component.ts"
    "components/product-grid.component.ts"
    "components/modern-product-card.component.ts"
    "components/modern-store-header.component.ts"
)

ALL_EXIST=true
for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ $component"
    else
        echo "❌ $component FEHLT!"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    echo ""
    echo "⚠️  Einige Komponenten fehlen! Bitte erstelle diese zuerst."
    exit 1
fi

echo ""
echo "✅ Migration abgeschlossen!"
echo ""
echo "📝 Nächste Schritte:"
echo "1. Öffne storefront.component.ts"
echo "2. Füge folgende Methoden hinzu (falls nicht vorhanden):"
echo ""
echo "   searchQuery = '';"
echo ""
echo "   onSearchChange(query: string): void {"
echo "     this.searchQuery = query.toLowerCase();"
echo "   }"
echo ""
echo "   get displayedProducts(): Product[] {"
echo "     let products = this.filteredProducts;"
echo "     if (this.searchQuery) {"
echo "       products = products.filter(p => "
echo "         p.name?.toLowerCase().includes(this.searchQuery) ||"
echo "         p.description?.toLowerCase().includes(this.searchQuery)"
echo "       );"
echo "     }"
echo "     return products;"
echo "   }"
echo ""
echo "3. Teste die Anwendung:"
echo "   npm start"
echo ""
echo "💡 Zum Rückgängig machen:"
echo "   mv storefront.component.html.backup storefront.component.html"
echo "   mv storefront.component.scss.backup storefront.component.scss"
echo ""

exit 0

