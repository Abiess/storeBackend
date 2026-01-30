#!/bin/bash
# Diagnose Database Script - Flyway Wrapper
# Ersetzt das alte diagnose-database.sh Script
# Nutzt jetzt Flyway für Datenbank-Diagnose

set -e

DB_PASSWORD="${DB_PASSWORD}"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "========================================"
echo "Database Diagnostics (Flyway-based)"
echo "========================================"
echo ""

# Prüfe ob DB_PASSWORD gesetzt ist
if [ -z "$DB_PASSWORD" ]; then
    print_warning "DB_PASSWORD nicht gesetzt - versuche ohne Authentifizierung"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLYWAY_HELPER="$SCRIPT_DIR/flyway-helper.sh"

# Prüfe ob flyway-helper.sh existiert
if [ ! -f "$FLYWAY_HELPER" ]; then
    print_error "flyway-helper.sh nicht gefunden: $FLYWAY_HELPER"
    echo ""
    echo "Dieser Script ist ein Wrapper für das neue Flyway-basierte System."
    echo "Bitte stelle sicher, dass flyway-helper.sh existiert."
    exit 1
fi

# Führe Flyway Diagnose aus
print_info "Führe Flyway-basierte Diagnose aus..."
echo ""

# Status prüfen
if bash "$FLYWAY_HELPER" status; then
    echo ""
    print_success "Flyway Migrations-Status OK"
else
    echo ""
    print_warning "Flyway Status-Prüfung fehlgeschlagen"
fi

echo ""

# Tabellen anzeigen
if bash "$FLYWAY_HELPER" tables; then
    echo ""
    print_success "Datenbank-Tabellen erfolgreich geprüft"
else
    echo ""
    print_error "Tabellen-Prüfung fehlgeschlagen"
    exit 1
fi

echo ""
print_success "Database Diagnostics abgeschlossen"
echo ""
echo "💡 Tipp: Verwende direkt flyway-helper.sh für erweiterte Funktionen:"
echo "   $FLYWAY_HELPER status   # Migrations-Status"
echo "   $FLYWAY_HELPER tables   # Tabellen anzeigen"
echo "   $FLYWAY_HELPER check    # Vollständige Prüfung"
echo ""

exit 0

